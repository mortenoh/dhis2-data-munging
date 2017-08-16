const request = require( 'superagent' );
const {generateAuthorization} = require( './dhis2-utils' );

module.exports = function({
  server = 'https://play.dhis2.org/demo',
  username = 'admin',
  password = 'district',
  globalQuery = {paging: false, skipPaging: true}
}) {
  const getRequest = (endpoint, query = {}) => {
    return request.get( `${server}/${endpoint}` )
      .set( 'Accept', 'application/json' )
      .set( 'Authorization', generateAuthorization( username, password ) )
      .query( globalQuery )
      .query( query );
  };

  const postRequest = (endpoint, body = {}, query = {}) => {
    return request.post( `${server}/${endpoint}` )
      .set( 'Accept', 'application/json' )
      .set( 'Content-Type', 'application/json' )
      .set( 'Authorization', generateAuthorization( username, password ) )
      .send( JSON.stringify( body ) )
      .query( globalQuery )
      .query( query );
  };

  const putRequest = (endpoint, body = {}, query = {}) => {
    return request.put( `${server}/${endpoint}` )
      .set( 'Accept', 'application/json' )
      .set( 'Content-Type', 'application/json' )
      .set( 'Authorization', generateAuthorization( username, password ) )
      .send( JSON.stringify( body ) )
      .query( globalQuery )
      .query( query );
  };

  const patchRequest = (endpoint, body = {}, query = {}) => {
    return request.patch( `${server}/${endpoint}` )
      .set( 'Accept', 'application/json' )
      .set( 'Content-Type', 'application/json' )
      .set( 'Authorization', generateAuthorization( username, password ) )
      .send( JSON.stringify( body ) )
      .query( globalQuery )
      .query( query );
  };

  const deleteRequest = (endpoint, body = {}, query = {}) => {
    return request.delete( `${server}/${endpoint}` )
      .set( 'Authorization', generateAuthorization( username, password ) )
      .query( globalQuery )
      .query( query );
  };

  return {
    get: getRequest,
    post: postRequest,
    put: putRequest,
    patch: patchRequest,
    delete: deleteRequest,
    me: async (body) => {
      if ( body ) {
        return (await putRequest( 'api/27/me', body )).body;
      }

      return (await getRequest( 'api/27/me' )).body;
    }
  }
};
