import { nulink_agent_config } from "../config";
import storage from "../utils/storage";
import {
    ApplyInfo,
    applyRequestData,
    approveRequestData,
    decryptionRequestData,
    loginResponseData,
    requisiteQueryData
} from "../types";
import { getKeyPair, privateKeyDecrypt } from "../utils/rsautil";
import { encrypt, decrypt } from "./passwordEncryption";
import { decrypt as aesDecryt } from "../utils/crypto";

export const cache_user_key: string = "userinfo";

export const connect = async (callBackFunc:CallBackFunc) => {
    window.open(nulink_agent_config.address + "/guide?from=outside&redirectUrl=" + document.location.toString())
    window.addEventListener("message", loginSuccessHandler.bind(this, callBackFunc))
}

type CallBackFunc =  ( responseData?:any ) => Promise<any>;

const loginSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const data:loginResponseData = e.data
    if (data) {
        if (data.action == 'login' && data.result == 'success') {
            await storage.setItem(cache_user_key, data);
            await callBackFunc(data)
            window.removeEventListener("message", loginSuccessHandler.bind(this, callBackFunc))
        }
    }
}

export const checkReLogin = async (responseData: any) => {
    if (responseData && responseData.subAction && responseData.subAction == "relogin") {
        const userInfo = {
            accountAddress: responseData.accountAddress,
            accountId: responseData.accountId
        };
        storage.setItem(cache_user_key, JSON.stringify(userInfo));
    }
}

export const upload = async (callBackFunc:CallBackFunc) => {
    const userInfo = await storage.getItem(cache_user_key);
    if (!!userInfo) {
        const queryData: requisiteQueryData = {
            accountAddress: userInfo.accountAddress,
            accountId: userInfo.accountId,
            redirectUrl: document.location.toString()
        };
        window.open(
            nulink_agent_config.address + "/upload-file?from=outside&data=" +
            encodeURIComponent(JSON.stringify(queryData)))
    } else {
        window.open(nulink_agent_config.address + "/upload-file?from=outside");
    }
    window.addEventListener("message", uploadSuccessHandler.bind(this, callBackFunc));
}

const uploadSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const responseData = e.data;
    if (responseData) {
        await checkReLogin(responseData)
        if (responseData.action == "upload" && responseData.result == "success") {
            await callBackFunc(responseData)
            window.removeEventListener("message", uploadSuccessHandler.bind(this, callBackFunc))
        }
    }
};

export const apply = async (applyInfo: ApplyInfo, callBackFunc:CallBackFunc) => {
    const userInfo = storage.getItem(cache_user_key);
    const agentAccountAddress = userInfo.accountAddress;
    const agentAccountId = userInfo.accountId;
    if (agentAccountAddress && agentAccountId) {
        const applyParam: applyRequestData = {
            accountAddress: agentAccountAddress,
            accountId: agentAccountId,
            redirectUrl: document.location.toString(),
            fileName: applyInfo.fileName,
            fileId: applyInfo.fileId,
            owner: applyInfo.fileCreatorAddress,
            user: userInfo.accountAddress,
            days: applyInfo.usageDays,
        };
        window.open(
            nulink_agent_config.address + "/request-files?from=outside&data=" +
            encodeURIComponent(JSON.stringify(applyParam))
        );
        window.addEventListener("message", applySuccessHandler.bind(this, callBackFunc));
    } else {
        throw new Error("Unlink user information not found, please log in first")
    }
}

const applySuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const responseData = e.data;
    if (responseData) {
        await checkReLogin(responseData)
        if (responseData.action == "apply" && responseData.result == "success") {
            await callBackFunc(responseData);
            window.removeEventListener("message", applySuccessHandler.bind(this, callBackFunc));
        }
    }
}

export const approve = async (applyId:string,
                              applyUserId:string,
                              applyUserAddress:string,
                              days:string,
                              remark:string,
                              callBackFunc:CallBackFunc) => {
    const userInfo = storage.getItem("userinfo");
    const agentAccountAddress = userInfo.accountAddress;
    const agentAccountId = userInfo.accountId;
    if (agentAccountAddress && agentAccountId) {
        const approveParam: approveRequestData = {
            accountAddress: agentAccountAddress,
            accountId: agentAccountId,
            userAccountId: applyUserId,
            redirectUrl: document.location.toString(),
            sourceUrl: document.domain,
            from: agentAccountAddress,
            to: applyUserAddress,
            applyId: applyId,
            days: days,
            remark: remark
        };

        window.open(
            nulink_agent_config.address + "/approve?from=outside&data=" +
            encodeURIComponent(JSON.stringify(approveParam))
        );
        window.addEventListener("message", approveSuccessHandler.bind(this, callBackFunc));
    }
};


const approveSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const responseData = e.data;
    if (responseData) {
        await checkReLogin(responseData)
        if (responseData.action == "approve") {
            await callBackFunc(responseData)
            window.removeEventListener("message", approveSuccessHandler.bind(this, callBackFunc));
        }
    }
};

export const download = async (fileId:string, fileName:string, applyUserAddress:string, callBackFunc:CallBackFunc) => {

    const keypair = getKeyPair()
    const publicKey = keypair.publicKey
    const encryptedKeypair = encrypt(JSON.stringify(keypair));
    await localStorage.setItem('encryptedKeypair', encryptedKeypair)
    const userInfo = storage.getItem("userinfo");
    const agentAccountAddress = userInfo.accountAddress
    const agentAccountId = userInfo.accountId

    if (agentAccountAddress && agentAccountId) {
        const decryptionRequestData: decryptionRequestData = {
            accountAddress: agentAccountAddress,
            accountId: agentAccountId,
            redirectUrl: document.location.toString(),
            fileId: fileId,
            fileName: fileName,
            from: agentAccountAddress,
            to: applyUserAddress,
            publicKey: publicKey
        }
        window.open(nulink_agent_config.address + "/request-authorization?from=outside&data=" + encodeURIComponent(JSON.stringify(decryptionRequestData)))
        window.addEventListener("message", authorizationSuccessHandler.bind(this, callBackFunc))
    }
};

const authorizationSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    try {
        const responseData = e.data
        const encryptedKeypair = await localStorage.getItem('encryptedKeypair')
        if (!!encryptedKeypair) {
            const keypair = JSON.parse(decrypt(encryptedKeypair))
            const _privateKey = keypair.privateKey
            const secret = privateKeyDecrypt(_privateKey, responseData.key)
            const response = JSON.parse(aesDecryt(responseData.data, secret))
            if (response) {
                await checkReLogin(response)
                if (response.action == 'decrypted' && response.result == 'success') {
                    await callBackFunc(response)
                    window.removeEventListener("message", authorizationSuccessHandler.bind(this, callBackFunc))
                }
            }
        } else {
            throw new Error("Key pair does not exist")
        }
    } catch (error) {
        throw new Error("Decryption failed, Please try again")
    }
}


