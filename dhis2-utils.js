const sample = (d = [], fn = Math.random) => {
  if ( d.length === 0 ) return;
  return d[Math.round( fn() * (d.length - 1) )];
};

const generateAuthorization = (username, password) => {
  return "Basic " + new Buffer( username + ":" + password ).toString( "base64" );
};

// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
const seededRandom = (m_w = 123456789) => {
  let m_z = 987654321;
  const mask = 0xffffffff;

  return function random() {
    m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
    m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
    let result = ((m_z << 16) + m_w) & mask;
    result /= 4294967296;

    return result + 0.5;
  }
};

const generateCode = (limit = 11, fn) => {
  const allowedLetters = ["abcdefghijklmnopqrstuvwxyz", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"].join( '' );
  const allowedChars = ['0123456789', allowedLetters].join( '' );

  const arr = [sample( allowedLetters, fn )];

  for ( let i = 0; i < limit - 1; i++ ) {
    arr.push( sample( allowedChars, fn ) );
  }

  return arr.join( '' );
};

module.exports = {
  generateCode,
  generateAuthorization,
  seededRandom,
  sample
};