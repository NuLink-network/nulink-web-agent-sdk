import { nulink_agent_config } from "../config";
import storage from "../utils/storage";
import {
    ApplyInfo,
    applyRequestData,
    batchApproveRequestData,
    decryptionRequestData,
    loginResponseData, NETWORK_LIST, netWorkList,
    requisiteQueryData
} from "../types";
import { getKeyPair, privateKeyDecrypt } from "../utils/rsautil";
import { encrypt, decrypt } from "./passwordEncryption";
import { decrypt as aesDecryt } from "../utils/crypto";
import { axios } from "../utils/axios";

export const cache_user_key: string = "userinfo";
export const cache_chain_id: string = "chain_id";

export const getNetWorkChainId = async (): Promise<number> => {
    return Number(await storage.getItem(cache_chain_id) || nulink_agent_config.chain_id)
}

export const setNetWorkChainId = async (chainId : string ) => {
    await storage.setItem(cache_chain_id, chainId);
}

export const connect = async (callBackFunc:CallBackFunc) => {
    if(nulink_agent_config.address){
        window.open(nulink_agent_config.address.endsWith("/")?nulink_agent_config.address.substring(0, nulink_agent_config.address.length -1):nulink_agent_config.address + "/guide?from=outside&redirectUrl=" + document.location.toString())
        window.addEventListener("message", loginSuccessHandler.bind(this, callBackFunc))
    } else {
        throw new Error("nulink agent address not found, please make sure that the REACT_APP_NULINK_AGENT_ADDRESS configuration is correct")
    }
}

type CallBackFunc =  ( responseData?:any ) => Promise<any>;

type FileData = {
    list: any[];
    total: number;
}


const loginSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const data:loginResponseData = e.data
    if (data) {
        if (data.action == 'login' && data.result == 'success') {
            await storage.setItem(cache_user_key, data);
            await storage.setItem(cache_chain_id, data.chainId);
            await callBackFunc(data)
            window.removeEventListener("message", loginSuccessHandler.bind(this, callBackFunc))
        }
    }
}

/*export const checkReLogin = async (responseData: any) => {
    if (responseData && responseData.subAction && responseData.subAction == "relogin") {
        const userInfo = {
            accountAddress: responseData.accountAddress,
            accountId: responseData.accountId
        };
        storage.setItem(cache_user_key, JSON.stringify(userInfo));
    }
}*/

export const upload = async (callBackFunc:CallBackFunc) => {
    const userInfo = await storage.getItem(cache_user_key);
    const _chainId = await getNetWorkChainId()
    const queryData: requisiteQueryData = {
        accountAddress: userInfo.accountAddress,
        accountId: userInfo.accountId,
        redirectUrl: document.location.toString(),
        chainId: _chainId
    };
    if (nulink_agent_config.address){
        window.open(
            nulink_agent_config.address.endsWith("/")?nulink_agent_config.address.substring(0, nulink_agent_config.address.length -1):nulink_agent_config.address + "/upload-file?from=outside&data=" +
            encodeURIComponent(JSON.stringify(queryData)))
    } else {
        throw new Error("nulink agent address not found, please make sure that the REACT_APP_NULINK_AGENT_ADDRESS configuration is correct")
    }
    window.addEventListener("message", uploadSuccessHandler.bind(this, callBackFunc));
}

const uploadSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const responseData = e.data;
    if (responseData) {
        if (responseData.action == "upload" && responseData.result == "success") {
            await callBackFunc(responseData)
            window.removeEventListener("message", uploadSuccessHandler.bind(this, callBackFunc))
        }
    }
};

export const apply = async (applyInfo: ApplyInfo, callBackFunc:CallBackFunc) => {
    const userInfo = await storage.getItem(cache_user_key);
    const _chainId = await getNetWorkChainId()
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
            chainId: _chainId
        };
        if (nulink_agent_config.address){
            window.open(
                nulink_agent_config.address.endsWith("/")?nulink_agent_config.address.substring(0, nulink_agent_config.address.length -1):nulink_agent_config.address + "/request-files?from=outside&data=" +
                encodeURIComponent(JSON.stringify(applyParam))
            );
        } else {
            throw new Error("nulink agent address not found, please make sure that the REACT_APP_NULINK_AGENT_ADDRESS configuration is correct")
        }
        window.addEventListener("message", applySuccessHandler.bind(this, callBackFunc));
    } else {
        throw new Error("Unlink user information not found, please log in first")
    }
}

const applySuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const responseData = e.data;
    if (responseData) {
        if (responseData.action == "apply" && responseData.result == "success") {
            await callBackFunc(responseData);
            window.removeEventListener("message", applySuccessHandler.bind(this, callBackFunc));
        }
    }
}

export const batchApprove = async (applyList:[{applyId : string,days : string, applyUserId: string }],
                              callBackFunc:CallBackFunc) => {
    const applyIds: string [] = applyList.map((item) => item.applyId)
    const days: string [] = applyList.map((item) => item.days)
    const _userAccountIds: string [] = applyList.map((item) => item.applyUserId)
    const userInfo = await storage.getItem(cache_user_key);
    const _chainId = await getNetWorkChainId()
    const agentAccountAddress = userInfo.accountAddress;
    const agentAccountId = userInfo.accountId;
    if (agentAccountAddress && agentAccountId) {
        const approveParam: batchApproveRequestData = {
            accountAddress: agentAccountAddress,
            accountId: agentAccountId,
            redirectUrl: document.location.toString(),
            sourceUrl: document.domain,
            from: agentAccountAddress,
            applyIds: applyIds,
            days: days,
            userAccountIds: _userAccountIds,
            chainId: _chainId
        };
        if (nulink_agent_config.address) {
            window.open(
                nulink_agent_config.address.endsWith("/")?nulink_agent_config.address.substring(0, nulink_agent_config.address.length -1):nulink_agent_config.address + "/approve?from=outside&data=" +
                    encodeURIComponent(JSON.stringify(approveParam))
            );
        } else {
            throw new Error("nulink agent address not found, please make sure that the REACT_APP_NULINK_AGENT_ADDRESS configuration is correct")
        }
        window.addEventListener("message", approveSuccessHandler.bind(this, callBackFunc));
    }
};

export const approve = async (applyId:string,
                              applyUserAddress:string,
                              applyUserId:string,
                              days:string,
                              callBackFunc:CallBackFunc) => {
    const userInfo = await storage.getItem(cache_user_key);
    const _chainId = await getNetWorkChainId()
    const agentAccountAddress = userInfo.accountAddress;
    const agentAccountId = userInfo.accountId;
    if (agentAccountAddress && agentAccountId) {
        const approveParam: batchApproveRequestData = {
            accountAddress: agentAccountAddress,
            accountId: agentAccountId,
            redirectUrl: document.location.toString(),
            sourceUrl: document.domain,
            from: agentAccountAddress,
            to: applyUserAddress,
            applyIds: [applyId],
            days: [days],
            userAccountIds: [applyUserId],
            chainId: _chainId
        };
        if (nulink_agent_config.address) {
            window.open(
                nulink_agent_config.address.endsWith("/")?nulink_agent_config.address.substring(0, nulink_agent_config.address.length -1):nulink_agent_config.address + "/approve?from=outside&data=" +
                encodeURIComponent(JSON.stringify(approveParam))
            );
        } else {
            throw new Error("nulink agent address not found, please make sure that the REACT_APP_NULINK_AGENT_ADDRESS configuration is correct")
        }
        window.addEventListener("message", approveSuccessHandler.bind(this, callBackFunc));
    }
};


const approveSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const responseData = e.data;
    if (responseData) {
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
    const _chainId = await getNetWorkChainId()
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
            publicKey: publicKey,
            chainId: _chainId
        }
        if (nulink_agent_config.address) {
            window.open(nulink_agent_config.address.endsWith("/")?nulink_agent_config.address.substring(0, nulink_agent_config.address.length -1):nulink_agent_config.address + "/request-authorization?from=outside&data=" + encodeURIComponent(JSON.stringify(decryptionRequestData)))
        } else {
            throw new Error("nulink agent address not found, please make sure that the REACT_APP_NULINK_AGENT_ADDRESS configuration is correct")
        }
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

export const getFileList = async (
    accountId:string, include:boolean, desc:boolean = false, pageNum:number, pageSize:number
): Promise<FileData> => {
    let result = await axios.post(nulink_agent_config.backend_address + '/file/others-list', {account_id: accountId, include: include, desc:desc, paginate: {page: pageNum, page_size: pageSize}})
    return result.data
};

export const getFileDetail = async (
    fileId: string,
    fileUserAccountId: string
): Promise<FileData> => {
    const _chainId = await getNetWorkChainId();
    let result = await axios.post(nulink_agent_config.backend_address + '/file/detail', {consumer_id: fileUserAccountId, file_id: fileId, chain_id: _chainId})
    return result.data
};

export const getSendApplyFiles = async (proposerId: string, status:number = 0, pageNum: number, pageSize: number): Promise<unknown> => {
    const _chainId = await getNetWorkChainId();
    let result =  await axios.post(nulink_agent_config.backend_address + '/apply/list', {
        proposer_id: proposerId, status: status, paginate: {page: pageNum, page_size: pageSize}, chain_id: _chainId
    })
    return result.data
}

export const getIncomingApplyFiles = async (fileOwnerId: string, status:number = 0, pageNum: number, pageSize: number): Promise<unknown> => {
    const _chainId = await getNetWorkChainId();
    let result = await axios.post(nulink_agent_config.backend_address + '/apply/list', {
        file_owner_id: fileOwnerId, status: status, paginate: {page: pageNum, page_size: pageSize}, chain_id: _chainId
    })
    return result.data
}

