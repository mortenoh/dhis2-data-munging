#!/usr/bin/env node

const program = require( 'commander' );
const {generateCode} = require( '../dhis2-utils' );

program.version( '0.1.0' );

program.command( 'uid' )
  .description( 'generate dhis2 compatible codes (UIDs)' )
  .option( '-l, --limit [limit]', 'number of UIDs to generate', 10 )
  .option( '--json', 'output in json format', false )
  .option( '--csv', 'output in csv format', false )
  .action( args => {
    const output = [];

    for ( let i = 0; i < args.limit; i++ ) {
      output.push( generateCode() );
    }

    if ( args.json ) {
      console.log( JSON.stringify( {codes: output} ) );
    } else if ( args.csv ) {
      console.log( 'codes' );
      output.forEach( c => console.log( c ) );
    } else {
      console.log( output.join( ' ' ) );
    }
  } );

program.parse( process.argv );

if ( !process.argv.slice( 2 ).length ) {
  program.outputHelp();
}
