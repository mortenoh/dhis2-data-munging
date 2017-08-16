const path = require( 'path' );
const ljf = require( 'load-json-file' );
const request = require( 'superagent' );
const _ = require( 'lodash' );
const {generateCode, seededRandom} = require( './dhis2-utils' );
const csvParse = require( 'csv-parse/lib/sync' );
const dhis2 = require( './dhis2' );
const config = require( './config.json' );

// load org units from filesystem
const getOrgUnits = () => ljf.sync( path.resolve( __dirname, 'data/ous.json' ) ).organisationUnits;

const getOrgUnitLevels = () => {
  return [['Global', 'a6Vvnk6gIGl'], ['Continent', 'B6GaXp4uh6O'], ['Country', 'WpwBhTOZ4K3']].map( (level, idx) => ({
    id: level[1],
    level: idx + 1,
    name: level[0]
  }) );
};

const createOrgUnits = async (d2) => {
  const metadata = {};

  metadata.organisationUnits = getOrgUnits();
  metadata.organisationUnitLevels = getOrgUnitLevels();

  // post metadata with orgUnits/orgUnitLevels
  try {
    const result = JSON.parse( (await d2.post( 'api/metadata', metadata )).text );

    if ( result.status !== "OK" ) {
      console.error( result );
      process.exit( -2 );
    }
  } catch ( err ) {
    console.error( err );
    process.exit( -1 );
  }
};

// update current user to have global as root org unit
const updateCurrentUserRootOrgUnit = async (d2) => {
  let rootOrgUnit = (await d2.get( 'api/organisationUnits', {filter: 'level:eq:1'} )).body.organisationUnits[0];
  let me = await d2.me();

  me.organisationUnits = [{id: rootOrgUnit.id}];

  const metadata = {
    users: [me]
  };

  try {
    const result = JSON.parse( (await d2.post( 'api/metadata', metadata )).text );

    if ( result.status !== "OK" ) {
      console.error( JSON.stringify( result ) );
      process.exit( -2 );
    }

    me = await d2.me();

    if ( me.organisationUnits.length !== 1 || me.organisationUnits[0].id !== 'u6yjgvIMzKn' ) {
      console.error( 'something went wrong while updating me.organisationUnits' );
      process.exit( -2 );
    }
  } catch ( err ) {
    console.error( JSON.stringify( err ) );
    process.exit( -1 );
  }
};

const createDataElements = async (d2) => {
  const data = await request.get( 'https://extranet.who.int/tme/generateCSV.asp' )
    .query( {ds: 'dictionary'} );

  // seed random generator with a stable seed
  const randomFn = seededRandom( 123123 );

  const csv = csvParse( data.text, {delimiter: ',', columns: true} );

  const deg = {};

  const de = csv.map( r => {
    const de = {};

    de.id = generateCode( 11, randomFn );
    de.name = _.truncate( r.variable_name, {length: 230} );
    de.code = _.truncate( r.variable_name, {length: 50} );
    de.shortName = _.truncate( r.variable_name, {length: 50} );
    de.domainType = 'AGGREGATE';
    de.valueType = 'INTEGER';
    de.aggregationType = 'SUM';
    de.description = r.definition;

    if ( r.dataset ) {
      if ( !deg[r.dataset] ) {
        deg[r.dataset] = {
          name: _.truncate( r.dataset, {length: 230} ),
          code: _.truncate( r.dataset, {length: 50} ),
          shortName: _.truncate( r.dataset, {length: 50} ),
          dataElements: []
        }
      }

      deg[r.dataset].dataElements.push( {id: de.id} );
    }

    return de;
  } );

  const metadata = {
    dataElements: de,
    dataElementGroups: Object.values( deg )
  };

  // post metadata with des/degs
  try {
    const result = JSON.parse( (await d2.post( 'api/metadata', metadata )).text );

    if ( result.status !== "OK" ) {
      console.error( JSON.stringify( result ) );
      process.exit( -2 );
    }
  } catch ( err ) {
    console.error( JSON.stringify( err ) );
    process.exit( -1 );
  }
};

const createDataValues = async (d2) => {
  const ous = (await d2.get( 'api/organisationUnits', {fields: 'id,code', filter: 'level:eq:3'} )).body.organisationUnits;
  const ous_code = _.groupBy( ous, 'code' );

  const des = (await d2.get( 'api/dataElements', {fields: 'id,code'} )).body.dataElements;
  const des_code = _.groupBy( des, 'code' );

  const estimates = csvParse( (await request.get( 'https://extranet.who.int/tme/generateCSV.asp' )
    .query( {ds: 'estimates'} )).text, {delimiter: ',', columns: true} );

  let data = estimates.map( o => _.pick( o, ['iso3', 'year', 'e_pop_num', 'e_inc_100k'] ) );

  // removed rows with invalid/missing orgunit
  data = data.filter( o => ous_code[o['iso3']] );

  const dataValues = [];

  data.forEach( o => {
    const template = {
      orgUnit: ous_code[o['iso3']][0].id,
      period: o.year
    };

    dataValues.push( Object.assign( {}, template, {
      dataElement: des_code['e_pop_num'][0].id,
      value: o['e_pop_num']
    } ) );

    dataValues.push( Object.assign( {}, template, {
      dataElement: des_code['e_inc_100k'][0].id,
      value: o['e_inc_100k']
    } ) );
  } );

  try {
    await d2.post( 'api/dataValueSets', {dataValues}, {preheatCache: true} );
    await d2.post( 'api/resourceTables/analytics' );
  } catch ( err ) {
    console.error( JSON.stringify( err ) );
    process.exit( -1 );
  }
};

(async () => {
  if ( !config.server || !config.username || !config.password ) {
    console.error( 'config.json does not include required keys: server, username, password' );
    process.exit( -1 );
  }

  const d2 = new dhis2( config );

  await createOrgUnits( d2 );
  await updateCurrentUserRootOrgUnit( d2 );
  await createDataElements( d2 );
  await createDataValues( d2 );
})();