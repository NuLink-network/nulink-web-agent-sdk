import jsrsasign  from 'jsrsasign'

/**
 * generate keypair
 */
export const getKeyPair = ():{ privateKey:string, publicKey:string } => {
    const rsaKeypair = jsrsasign.KEYUTIL.generateKeypair('RSA', 1024);
    let _publicKey = jsrsasign.KEYUTIL.getPEM(rsaKeypair.prvKeyObj);
    let _privateKey = jsrsasign.KEYUTIL.getPEM(rsaKeypair.prvKeyObj,'PKCS8PRV');
    return {privateKey: _privateKey, publicKey: _publicKey}
}

/**
 * public key encrypt
 * @param publicKey
 * @param plaintext
 */
export const publicKeyEncrypt = ( publicKey:string, plaintext:string ) => {
    const pub = jsrsasign.KEYUTIL.getKey(publicKey);
    // @ts-ignore
    const enc = jsrsasign.KJUR.crypto.Cipher.encrypt(plaintext, pub);
    return jsrsasign.hextob64(enc);
}

/**
 * private key decrypt
 * @param privateKey
 * @param plaintext
 */
export const privateKeyDecrypt = (privateKey:string, ciphertext:string) => {
    const prv = jsrsasign.KEYUTIL.getKey(privateKey);
    // @ts-ignore
    return jsrsasign.KJUR.crypto.Cipher.decrypt(jsrsasign.b64utohex(ciphertext), prv);
}


