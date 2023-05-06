import CryptoJS from 'crypto-js';


export const encrypt = (text:string, secretKey:string) => {

    return CryptoJS.AES.encrypt(text, secretKey).toString()

};

export const decrypt = (ciphertext:string, secretKey:string) => {

    const bytes  = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText

};
