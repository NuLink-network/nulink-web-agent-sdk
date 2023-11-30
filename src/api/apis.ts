import { nulink_agent_config } from "../config";
import storage from "../utils/storage";
import {
    ApplyInfo,
    applyRequestData,
    batchApproveRequestData,
    decryptionRequestData,
    loginResponseData, NETWORK_LIST, netWorkList,
    requisiteQueryData, transactionRequestData
} from "../types";
import { getKeyPair, privateKeyDecrypt } from "../utils/rsautil";
import { encrypt, decrypt } from "./passwordEncryption";
import { decrypt as aesDecryt } from "../utils/crypto";
import { axios } from "../utils/axios";

export const cache_user_key: string = "userinfo";
export const cache_chain_id: string = "chain_id";

const agentAddress = nulink_agent_config.address

const arrayBufferToString = (arrayBuffer:ArrayBuffer) => {
    const decoder = new TextDecoder('utf-8');
    const uint8Array = new Uint8Array(arrayBuffer);
    const string = decoder.decode(uint8Array);
    return string;
}


export const getNetWorkChainId = async (): Promise<number> => {
    return Number(await storage.getItem(cache_chain_id) || nulink_agent_config.chain_id)
}

export const setNetWorkChainId = async (chainId : string ) => {
    await storage.setItem(cache_chain_id, chainId);
}

const getAgentAddress = () => {
  return nulink_agent_config.address.endsWith('/')? nulink_agent_config.address.substring(0, nulink_agent_config.address.length -1) : nulink_agent_config.address
}

const getAgentBackendAddress = () => {
    return nulink_agent_config.backend_address.endsWith('/')? nulink_agent_config.backend_address.substring(0, nulink_agent_config.backend_address.length -1) : nulink_agent_config.backend_address
}

export const connect = async (callBackFunc:CallBackFunc) => {
    const _chainId = await getNetWorkChainId()
    const queryData = {
        redirectUrl: document.location.toString(),
        chainId: _chainId
    };
    window.open(getAgentAddress() + "/guide?from=outside&data=" + encodeURIComponent(JSON.stringify(queryData)))
    window.addEventListener("message", loginSuccessHandler.bind(this, callBackFunc))
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
    window.open(getAgentAddress() + "/upload-file?from=outside&data=" + encodeURIComponent(JSON.stringify(queryData)))
    window.addEventListener("message", uploadSuccessHandler.bind(this, callBackFunc));
}

export const arrayBufferUploadBatch = async (ownerAddress:string, dataLabel: string, fileArrayBuffer: ArrayBuffer[], callBackFunc:CallBackFunc) => {
    const userInfo = await storage.getItem(cache_user_key);
    const requestData = {
        accountAddress: userInfo.accountAddress,
        accountId: userInfo.accountId,
        redirectUrl: document.location.toString(),
        chainId: await getNetWorkChainId()
    }
    const agentWindow = window.open(getAgentAddress() + "/upload-file?from=outside&data=" + encodeURIComponent(JSON.stringify(requestData)))
    if (agentWindow && !agentWindow.closed){
        fileArrayBuffer.forEach((item) => {
            window.postMessage(arrayBufferToString(item), agentAddress)
        })
        window.postMessage('END_FLAG', agentAddress)
    }
    window.addEventListener("message", uploadSuccessHandler.bind(this, callBackFunc));
}

export const arrayBufferUpload = async (ownerAddress:string, dataLabel: string, fileArrayBuffer: ArrayBuffer, callBackFunc:CallBackFunc) => {
    const arrayBuffers: ArrayBuffer[] = [];
    arrayBuffers.push(fileArrayBuffer)
    await arrayBufferUploadBatch(ownerAddress, dataLabel, arrayBuffers, callBackFunc)
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
        window.open( getAgentAddress() + "/request-files?from=outside&data=" + encodeURIComponent(JSON.stringify(applyParam)));
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

export const batchApprove = async (applyList:[{applyId : string,days : string, applyUserId: string, backupNodeNum: number }],
                              callBackFunc:CallBackFunc) => {
    const applyIds: string [] = applyList.map((item) => item.applyId)
    const days: string [] = applyList.map((item) => item.days)
    const _userAccountIds: string [] = applyList.map((item) => item.applyUserId)
    const _backupNodeNumArray: number [] = applyList.map((item) => item.backupNodeNum)
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
            backupNodeNum: _backupNodeNumArray,
            chainId: _chainId
        };
        window.open(getAgentAddress() + "/approve?from=outside&data=" + encodeURIComponent(JSON.stringify(approveParam)));
        window.addEventListener("message", approveSuccessHandler.bind(this, callBackFunc));
    }
};

export const approve = async (applyId:string,
                              applyUserAddress:string,
                              applyUserId:string,
                              days:string,
                              backupNodeNum:number,
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
            backupNodeNum:[backupNodeNum],
            chainId: _chainId
        };
        window.open(getAgentAddress()+ "/approve?from=outside&data=" + encodeURIComponent(JSON.stringify(approveParam)));
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
        window.open(getAgentAddress() + "/request-authorization?from=outside&data=" + encodeURIComponent(JSON.stringify(decryptionRequestData)))
        window.addEventListener("message", authorizationSuccessHandler.bind(this, callBackFunc))
    }
};

const authorizationSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    try {
        const responseData = e.data
        if (responseData.action && responseData.action == 'decrypted'){
            const encryptedKeypair = await localStorage.getItem('encryptedKeypair')
            if (!!encryptedKeypair) {
                const keypair = JSON.parse(decrypt(encryptedKeypair))
                const _privateKey = keypair.privateKey
                if (responseData._nuLinkDecryptionKey){
                    const secret = privateKeyDecrypt(_privateKey, responseData._nuLinkDecryptionKey)
                    const response = JSON.parse(aesDecryt(responseData.data, secret))
                    if (response) {
                        if (response.action == 'decrypted') {
                            await callBackFunc(response)
                            window.removeEventListener("message", authorizationSuccessHandler.bind(this, callBackFunc))
                        }
                    }
                } else {
                    throw new Error("NuLink Decryption Key does not exist, Please contact the administrator")
                }
            } else {
                throw new Error("Key pair does not exist")
            }
        }
    } catch (error) {
        throw new Error((error as string).toString())
    }
}

export const getFileList = async (
    accountId:string, include:boolean, desc:boolean = false, pageNum:number, pageSize:number
): Promise<FileData> => {
    let result = await axios.post(getAgentBackendAddress() + '/file/others-list', {account_id: accountId, include: include, desc:desc, paginate: {page: pageNum, page_size: pageSize}})
    return result.data
};

export const getFileDetail = async (
    fileId: string,
    fileUserAccountId: string
): Promise<FileData> => {
    const _chainId = await getNetWorkChainId();
    let result = await axios.post(getAgentBackendAddress() + '/file/detail', {consumer_id: fileUserAccountId, file_id: fileId, chain_id: _chainId})
    return result.data
};

export const getSendApplyFiles = async (proposerId: string, status:number = 0, pageNum: number, pageSize: number): Promise<unknown> => {
    const _chainId = await getNetWorkChainId();
    let result =  await axios.post(getAgentBackendAddress() + '/apply/list', {
        proposer_id: proposerId, status: status, paginate: {page: pageNum, page_size: pageSize}, chain_id: _chainId
    })
    return result.data
}

export const getIncomingApplyFiles = async (fileOwnerId: string, status:number = 0, pageNum: number, pageSize: number): Promise<unknown> => {
    const _chainId = await getNetWorkChainId();
    let result = await axios.post(getAgentBackendAddress() + '/apply/list', {
        file_owner_id: fileOwnerId, status: status, paginate: {page: pageNum, page_size: pageSize}, chain_id: _chainId
    })
    return result.data
}

/**
 *
 * @param toAddress: The recevier of the transaction.
 * @param rawTxData: The call data of the transaction, can be empty for simple value transfers.
 * @param value: The value of the transaction in wei.
 * @param gasPrice: The gas price set by this transaction, if empty, it will use web3.eth.getGasPrice()
 * @param callBackFunc: A callback function that will be called with the response data from the server.
 */
export const sendCustomTransaction = async (callBackFunc:CallBackFunc, toAddress: string, rawTxData?: string, value?: string, gasPrice?: string) => {
    if (toAddress.length < 1){
        throw new Error("The receiving address cannot be empty.")
    }
    const userInfo = await storage.getItem(cache_user_key);
    const agentAccountAddress = userInfo.accountAddress;
    const agentAccountId = userInfo.accountId;
    const _chainId = await getNetWorkChainId()
    if(agentAccountAddress && agentAccountId){
        const transactionData: transactionRequestData = {
            accountAddress: agentAccountAddress,
            accountId: agentAccountId,
            redirectUrl: document.location.toString(),
            sourceUrl: document.domain,
            toAddress: toAddress,
            rawTxData: rawTxData,
            value: value,
            gasPrice: gasPrice,
            chainId: _chainId
        }
        window.open(getAgentAddress() + "/send-transaction?from=outside&data=" + encodeURIComponent(JSON.stringify(transactionData)))
        window.addEventListener("message", transactionSuccessHandler.bind(this, callBackFunc))
    }
}

const transactionSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const responseData = e.data;
    if (responseData) {
        if (responseData.action == "transaction") {
            await callBackFunc(responseData);
            window.removeEventListener("message", transactionSuccessHandler.bind(this, callBackFunc));
        }
    }
}
