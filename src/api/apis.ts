import { nulink_agent_config } from "../config";
import storage from "../utils/storage";
import {
    ApplyInfo,
    applyRequestData,
    batchApproveRequestData,
    decryptionRequestData,
    loginResponseData,
    transactionRequestData,
    UploadData
} from "../types";
import { getKeyPair, privateKeyDecrypt } from "../utils/rsautil";
import { encrypt, decrypt } from "./passwordEncryption";
import { decrypt as aesDecryt } from "../utils/crypto";
import { axios } from "../utils/axios";
import {isBlank} from "../utils/null";
import {AxiosResponse} from "axios";

export const cache_user_key: string = "nulink_user_info";
export const cache_chain_id: string = "chain_id";

const agentAddress = nulink_agent_config.address

export const getNetWorkChainId = async (): Promise<number> => {
    return Number(await storage.getItem(cache_chain_id) || nulink_agent_config.chain_id)
}

export const setNetWorkChainId = async (chainId : number ) => {
    const chainIds = [97, 71]
    if (chainIds.includes(chainId)){
        await storage.setItem(cache_chain_id, chainId);
    } else {
        throw new Error("The current network is not supported(chain id:" + chainId + ")")
    }
}

/**
 * convert File To UploadData
 * @param files
 */
export const convertFileToUploadData = async (files : File[]) => {
    const upFiles: any = []
    for (const file of files) {
        const fileBinaryArrayBuffer: ArrayBuffer = await blobToArrayBuffer(file) as ArrayBuffer
        upFiles.push({ name: file.name, fileBinaryArrayBuffer })
    }
    upFiles.forEach((x) => {
        x.fileBinaryArrayBuffer = Buffer.from(x.fileBinaryArrayBuffer).buffer
    })
    return upFiles
}

//* Convert resBlob to ArrayBuffer
const blobToArrayBuffer = (blob: Blob) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = (e: any) => {
            const fileBinaryArrayBuffer = new Uint8Array(e?.target?.result).buffer;
            resolve(fileBinaryArrayBuffer);
        }
        reader.readAsArrayBuffer(blob);
    });
}

const getAgentAddress = () => {
  return nulink_agent_config.address.endsWith('/')? nulink_agent_config.address.substring(0, nulink_agent_config.address.length -1) : nulink_agent_config.address
}

const getAgentBackendAddress = () => {
    return nulink_agent_config.backend_address.endsWith('/')? nulink_agent_config.backend_address.substring(0, nulink_agent_config.backend_address.length -1) : nulink_agent_config.backend_address
}

const getStakingServiceAddress = () => {
    return nulink_agent_config.staking_service_url.endsWith('/')? nulink_agent_config.staking_service_url.substring(0, nulink_agent_config.staking_service_url.length -1) : nulink_agent_config.staking_service_url
}

const getPorterServiceAddress = () => {
    return nulink_agent_config.porter_url.endsWith('/')? nulink_agent_config.porter_url.substring(0, nulink_agent_config.porter_url.length -1) : nulink_agent_config.porter_url
}

let loginListener: { (e: any): Promise<void>; (this: Window, ev: MessageEvent<any>): any; (this: Window, ev: MessageEvent<any>): any; };

export const connect = async (callBackFunc:CallBackFunc) => {
    const _chainId = await getNetWorkChainId()
    const queryData = {
        redirectUrl: document.location.toString(),
        chainId: _chainId
    };
    window.open(getAgentAddress() + "/guide?from=outside&data=" + encodeURIComponent(JSON.stringify(queryData)))
    loginListener = loginSuccessHandler.bind(this, callBackFunc);
    window.addEventListener("message", loginListener)
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
            window.removeEventListener("message", loginListener)
        }
    }
}

let uploadDataListener: { (e: any): Promise<void>; (this: Window, ev: MessageEvent<any>): any; (this: Window, ev: MessageEvent<any>): any; };


/**
 *  Upload Data
 * @param _uploaddata
 * type UploadData = {
 *     dataLabel : string,
 *     fileBinaryArrayBuffer: Blob
 * }
 * @param callBackFunc
 */
export const uploadData = async (_uploadData: UploadData, callBackFunc:CallBackFunc) => {
    if (isBlank(_uploadData.dataLabel)){
        throw new Error("The uploaded data label must not be empty")
    }
    if (_uploadData.fileBinaryArrayBuffer instanceof ArrayBuffer){
        if (_uploadData.fileBinaryArrayBuffer.byteLength > 5242880){
            throw new Error("The maximum size for pre-uploaded data must not exceed 5 MB")
        }
    }
    if (_uploadData.fileBinaryArrayBuffer instanceof Blob){
        if (_uploadData.fileBinaryArrayBuffer.size > 5242880){
            throw new Error("The maximum size for pre-uploaded data must not exceed 5 MB")
        }
    }
    const userInfo = await storage.getItem(cache_user_key);
    const requestData = {
        accountAddress: userInfo.accountAddress,
        accountId: userInfo.accountId,
        redirectUrl: document.location.toString(),
        chainId: await getNetWorkChainId()
    }
    const agentWindow = window.open(getAgentAddress() + "/upload-view?from=outside&data=" + encodeURIComponent(JSON.stringify(requestData)));

    function handleMessageEvent(ev) {
        if (ev.data == "agent_success") {
            if (agentWindow && !agentWindow.closed) {
                const message:any = {
                    action: 'upload',
                    fileList: [_uploadData]
                }
                agentWindow.postMessage(message, '*');
                console.log("send message finish")
                window.removeEventListener("message", handleMessageEvent);
            }
        }
    }

    window.addEventListener("message", handleMessageEvent);
    uploadDataListener = uploadSuccessHandler.bind(this, callBackFunc);
    window.addEventListener("message", uploadDataListener);
}

/**
 *  Upload Data Batch
 * @param dataList : UploadData[]
 * type UploadData = {
 *     dataLabel : string,
 *     fileBinaryArrayBuffer: Blob
 * }
 * @param callBackFunc
 */
export const uploadDataBatch = async (dataList: UploadData[], callBackFunc:CallBackFunc) => {
    if (dataList.length < 1){
        throw new Error("The uploaded data must not be empty")
    }
    if (dataList.length > 5){
        throw new Error("The uploaded data cannot exceed five")
    }
    dataList.forEach(data => {
        if (data.fileBinaryArrayBuffer instanceof ArrayBuffer){
            if (data.fileBinaryArrayBuffer.byteLength > 5242880){
                throw new Error("The maximum size for pre-uploaded data must not exceed 5 MB")
            }
        }
        if (data.fileBinaryArrayBuffer instanceof Blob){
            if (data.fileBinaryArrayBuffer.size > 5242880){
                throw new Error("The maximum size for pre-uploaded data must not exceed 5 MB")
            }
        }

    })

    const userInfo = await storage.getItem(cache_user_key);
    const requestData = {
        accountAddress: userInfo.accountAddress,
        accountId: userInfo.accountId,
        redirectUrl: document.location.toString(),
        chainId: await getNetWorkChainId()
    }
    const agentWindow = window.open(getAgentAddress() + "/upload-view?from=outside&data=" + encodeURIComponent(JSON.stringify(requestData)));

    function handleMessageEvent(ev) {
        if (ev.data == "agent_success") {
            if (agentWindow && !agentWindow.closed) {
                const message:any = {
                    action: 'upload',
                    fileList: dataList
                }
                agentWindow.postMessage(message, '*');
                console.log("send message finish")
                window.removeEventListener("message", handleMessageEvent);
            }
        }
    }

    window.addEventListener("message", handleMessageEvent);
    uploadDataListener = uploadSuccessHandler.bind(this, callBackFunc);
    window.addEventListener("message", uploadDataListener);
}

/**
 *  Upload File
 * @param files : File[]
 * @param callBackFunc
 */
export const uploadFile = async (file: File, callBackFunc:CallBackFunc) => {

    if (file.size > 5242880){
        throw new Error("The maximum size for pre-uploaded data must not exceed 5 MB")
    }
    const userInfo = await storage.getItem(cache_user_key);
    const requestData = {
        accountAddress: userInfo.accountAddress,
        accountId: userInfo.accountId,
        redirectUrl: document.location.toString(),
        chainId: await getNetWorkChainId()
    }

    const dataList = await convertFileToUploadData([file])

    const agentWindow = window.open(getAgentAddress() + "/upload-view?from=outside&data=" + encodeURIComponent(JSON.stringify(requestData)));

    function handleMessageEvent(ev) {
        if (ev.data == "agent_success") {
            if (agentWindow && !agentWindow.closed) {
                const message:any = {
                    action: 'upload',
                    fileList: dataList
                }
                agentWindow.postMessage(message, '*');
                console.log("send message finish")
                window.removeEventListener("message", handleMessageEvent);
            }
        }
    }

    window.addEventListener("message", handleMessageEvent);
    uploadDataListener = uploadSuccessHandler.bind(this, callBackFunc);
    window.addEventListener("message", uploadDataListener);
}

/**
 *  Upload File Batch
 * @param files : File[]
 * @param callBackFunc
 */
export const uploadFileBatch = async (files: File[], callBackFunc:CallBackFunc) => {
    if (files.length < 1){
        throw new Error("The uploaded data must not be empty")
    }
    if (files.length > 5){
        throw new Error("The uploaded data cannot exceed five")
    }
    files.forEach(data => {
        if (data.size > 5242880){
            throw new Error("The maximum size for pre-uploaded data must not exceed 5 MB")
        }
    })
    const userInfo = await storage.getItem(cache_user_key);
    const requestData = {
        accountAddress: userInfo.accountAddress,
        accountId: userInfo.accountId,
        redirectUrl: document.location.toString(),
        chainId: await getNetWorkChainId()
    }

    const dataList = await convertFileToUploadData(files)

    const agentWindow = window.open(getAgentAddress() + "/upload-view?from=outside&data=" + encodeURIComponent(JSON.stringify(requestData)));

    function handleMessageEvent(ev) {
        if (ev.data == "agent_success") {
            if (agentWindow && !agentWindow.closed) {
                const message:any = {
                    action: 'upload',
                    fileList: dataList
                }
                agentWindow.postMessage(message, '*');
                console.log("send message finish")
                window.removeEventListener("message", handleMessageEvent);
            }
        }
    }

    window.addEventListener("message", handleMessageEvent);
    uploadDataListener = uploadSuccessHandler.bind(this, callBackFunc);
    window.addEventListener("message", uploadDataListener);
}

const uploadSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const responseData = e.data;
    if (responseData) {
        if (responseData.action == "upload" && responseData.result == "success") {
            await callBackFunc(responseData)
            window.removeEventListener("message", uploadDataListener)
        }
    }
};

let applyListener: { (e: any): Promise<void>; (this: Window, ev: MessageEvent<any>): any; (this: Window, ev: MessageEvent<any>): any; };


/**
 * apply
 *
 * @param dataName
 * @param dataId
 * @param dataCreatorAddress
 * @param dataUrl
 * @param dataHash
 * @param zkProof
 * @param usageDays
 * @param callBackFunc
 */
export const apply = async (dataName: string,
                            dataId: string,
                            dataCreatorAddress: string,
                            dataUrl: string,
                            dataHash: string,
                            zkProof: string,
                            usageDays: number,
                            callBackFunc:CallBackFunc) => {
    if(isBlank(dataName)){
        throw new Error("dataName cannot be empty")
    }
    if(isBlank(dataId)){
        throw new Error("dataId cannot be empty")
    }
    if(isBlank(dataCreatorAddress)){
        throw new Error("dataCreatorAddress cannot be empty")
    }
    if(isBlank(dataUrl)){
        throw new Error("dataUrl cannot be empty")
    }
    if(isBlank(dataHash)){
        throw new Error("dataHash cannot be empty")
    }
    if(isBlank(zkProof)){
        throw new Error("zkProof cannot be empty")
    }
    if(isBlank(usageDays)){
        throw new Error("usageDays cannot be empty")
    }
    const userInfo = await storage.getItem(cache_user_key);
    const _chainId = await getNetWorkChainId()
    const agentAccountAddress = userInfo.accountAddress;
    const agentAccountId = userInfo.accountId;
    if (agentAccountAddress && agentAccountId) {
        const applyParam: applyRequestData = {
            accountAddress: agentAccountAddress,
            accountId: agentAccountId,
            redirectUrl: document.location.toString(),
            fileName: dataName,
            dataHash: dataHash,
            dataStorageUrl: dataUrl,
            fileId: dataId,
            zkProof: zkProof,
            owner: dataCreatorAddress,
            user: userInfo.accountAddress,
            days: usageDays,
            chainId: _chainId
        };
        window.open( getAgentAddress() + "/request-files?from=outside&data=" + encodeURIComponent(JSON.stringify(applyParam)));
        applyListener = applySuccessHandler.bind(this, callBackFunc);
        window.addEventListener("message", applyListener);
    } else {
        throw new Error("Unlink user information not found, please log in first")
    }
}

const applySuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const responseData = e.data;
    if (responseData) {
        if (responseData.action == "apply" && responseData.result == "success") {
            await callBackFunc(responseData);
            window.removeEventListener("message", applyListener);
        }
    }
}

/*/!**
 * batch approve
 * @param applyList
 * type ApproveInfo = {
 *     applyId : string
 *     applyUserId: string
 *     fileName: string
 *     fileHash: string
 *     fileStorageUrl: string
 *     days : string
 *     backupNodeNum: number
 * }
 * @param callBackFunc
 *!/
export const batchApprove = async (applyList: ApproveInfo[],
                              callBackFunc:CallBackFunc) => {
    const applyIds: string [] = []
    const days: string [] = []
    const _userAccountIds: string [] = []
    const _backupNodeNumArray: number [] = []
    const dataLabels : string[] = [];
    const dataHashes : string[] = [];
    const dataStorageUrl : string[] = [];
    applyList.forEach(item => {
        applyIds.push(item.applyId)
        days.push(item.days)
        _userAccountIds.push(item.applyUserId)
        _backupNodeNumArray.push(item.backupNodeNum)
        dataLabels.push(item.fileName)
        dataHashes.push(item.fileHash)
        dataStorageUrl.push(item.fileStorageUrl)
    })
    const userInfo = await storage.getItem(cache_user_key);
    const _chainId = await getNetWorkChainId()
    const agentAccountAddress = userInfo.accountAddress;
    const agentAccountId = userInfo.accountId;
    if (agentAccountAddress && agentAccountId) {
        const approveParam: batchApproveRequestData = {
            dataStorageUrl: dataStorageUrl,
            dataHash: dataLabels, dataLabel: dataHashes,
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
};*/

let approveListener: { (e: any): Promise<void>; (this: Window, ev: MessageEvent<any>): any; (this: Window, ev: MessageEvent<any>): any; };
/**
 * approve
 * @param applyId
 * @param applyUserAddress
 * @param applyUserId
 * @param dataName
 * @param dataHash
 * @param dataUrl
 * @param days
 * @param backupNodeNum
 * @param callBackFunc
 */
export const approve = async (applyId:string,
                              applyUserAddress:string,
                              applyUserId:string,
                              dataName: string,
                              dataHash: string,
                              dataUrl: string,
                              days:string,
                              backupNodeNum:number,
                              callBackFunc:CallBackFunc) => {
    if(isBlank(applyId)){
        throw new Error("applyId cannot be empty")
    }
    if(isBlank(applyUserAddress)){
        throw new Error("applyUserAddress cannot be empty")
    }
    if(isBlank(applyUserId)){
        throw new Error("applyUserId cannot be empty")
    }
    if(isBlank(dataName)){
        throw new Error("dataName cannot be empty")
    }
    if(isBlank(dataHash)){
        throw new Error("dataHash cannot be empty")
    }
    if(isBlank(dataUrl)){
        throw new Error("dataUrl cannot be empty")
    }
    if(isBlank(days)){
        throw new Error("days cannot be empty")
    }
    if(isBlank(backupNodeNum)){
        throw new Error("backupNodeNum cannot be empty")
    }
    const userInfo = await storage.getItem(cache_user_key);
    const _chainId = await getNetWorkChainId()
    const agentAccountAddress = userInfo.accountAddress;
    const agentAccountId = userInfo.accountId;
    if (agentAccountAddress && agentAccountId) {
        const approveParam: batchApproveRequestData = {
            dataStorageUrl: [dataUrl],
            accountAddress: agentAccountAddress,
            accountId: agentAccountId,
            redirectUrl: document.location.toString(),
            sourceUrl: document.domain,
            from: agentAccountAddress,
            to: applyUserAddress,
            applyIds: [applyId],
            days: [days],
            dataHash: [dataHash],
            dataLabel: [dataName],
            userAccountIds: [applyUserId],
            backupNodeNum:[backupNodeNum],
            chainId: _chainId
        };
        window.open(getAgentAddress()+ "/approve?from=outside&data=" + encodeURIComponent(JSON.stringify(approveParam)));
        approveListener = approveSuccessHandler.bind(this, callBackFunc);
        window.addEventListener("message", approveListener);
    }
};

const approveSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    const responseData = e.data;
    if (responseData) {
        if (responseData.action == "approve") {
            await callBackFunc(responseData)
            window.removeEventListener("message", approveListener);
        }
    }
};

let downloadListener: { (e: any): Promise<void>; (this: Window, ev: MessageEvent<any>): any; (this: Window, ev: MessageEvent<any>): any; };

/**
 * download
 * @param dataId : string - The ID of the data to be downloaded.
 * @param dataName : string - The name of the data to be downloaded.
 * @param dataHash : string - The hash of the data to be downloaded.
 * @param ownerAddress : string - the owner of the data
 * @param zkProof : string - the zk proof of the data
 * @param dataUrl : string
 * @param encryptedDataSize - the size of encrypted data
 * @param callBackFunc : CallBackFunc - A callback function that will be called with the response data from the server.
 */
export const download = async (dataId:string,
                               dataName:string,
                               dataHash: string,
                               ownerAddress:string,
                               zkProof: string,
                               dataUrl: string,
                               encryptedDataSize: string,
                               callBackFunc:CallBackFunc)=> {

    if(isBlank(dataId)){
        throw new Error("dataId cannot be empty")
    }
    if(isBlank(dataName)){
        throw new Error("dataName cannot be empty")
    }
    if(isBlank(dataHash)){
        throw new Error("dataHash cannot be empty")
    }
    if(isBlank(ownerAddress)){
        throw new Error("ownerAddress cannot be empty")
    }
    if(isBlank(zkProof)){
        throw new Error("zkProof cannot be empty")
    }
    if(isBlank(dataUrl)){
        throw new Error("dataUrl cannot be empty")
    }
    if(isBlank(encryptedDataSize)){
        throw new Error("encryptedDataSize cannot be empty")
    }
    const keypair = getKeyPair()
    const publicKey = keypair.publicKey
    const encryptedKeypair = encrypt(JSON.stringify(keypair));
    await localStorage.setItem('encryptedKeypair', encryptedKeypair)
    const userInfo = storage.getItem(cache_user_key);
    const _chainId = await getNetWorkChainId()
    const agentAccountAddress = userInfo.accountAddress
    const agentAccountId = userInfo.accountId

    if (agentAccountAddress && agentAccountId) {
        const decryptionRequestData: decryptionRequestData = {
            accountAddress: agentAccountAddress,
            accountId: agentAccountId,
            redirectUrl: document.location.toString(),
            fileId: dataId,
            fileName: dataName,
            dataHash: dataHash,
            dataZKProof: zkProof,
            dataStorageUrl: dataUrl,
            encryptedDataSize: encryptedDataSize,
            owner: ownerAddress,
            user: agentAccountAddress,
            publicKey: publicKey,
            chainId: _chainId
        }
        window.open(getAgentAddress() + "/request-authorization?from=outside&data=" + encodeURIComponent(JSON.stringify(decryptionRequestData)))
        downloadListener = authorizationSuccessHandler.bind(this, callBackFunc);
        window.addEventListener("message", downloadListener)
    }
};

const stringToArrayBuffer = (str: string): ArrayBuffer => {
    const buffer = new ArrayBuffer(str.length);
    const uintArray = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i++) {
        uintArray[i] = str.charCodeAt(i);
    }
    return buffer;
}

const authorizationSuccessHandler = async (callBackFunc:CallBackFunc, e:any) => {
    try {
        const responseData = e.data
        if (responseData.action && responseData.action == 'decrypted') {
            const encryptedKeypair = await localStorage.getItem('encryptedKeypair')
            if (!!encryptedKeypair) {
                const keypair = JSON.parse(decrypt(encryptedKeypair))
                const _privateKey = keypair.privateKey
                if (responseData._nuLinkDecryptionKey) {
                    const secret = privateKeyDecrypt(_privateKey, responseData._nuLinkDecryptionKey)
                    const response = JSON.parse(aesDecryt(responseData.data, secret))
                    if (response) {
                        if (response.action == 'decrypted') {
                            response.arrayBuffer = stringToArrayBuffer(response.arrayBuffer)
                            await callBackFunc(response)
                            window.removeEventListener("message", downloadListener)
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

/**
 * get file list
 * @param accountId : string - ID of the currently logged-in user
 * @param fileName : string - File name, supports fuzzy matching, can be empty.
 * @param include : boolean - If include=false, exclude the files belonging to the current account; otherwise, the files belonging to the current user will be placed at the beginning of the list.
 * @param format : string - the format of file,can be empty.
 * @param desc : boolean - Whether to sort in descending order by upload time
 * @param pageNum : number - page number (starting from 1)
 * @param pageSize : number - page size
 * @return
 * {
 *   "code": 2000,
 *   "msg": "Success",
 *   "data":
 *       {
 *         total: number
 *         list: [{
 *         file_id: string - the file ID
 *         file_name: string - the file name
 *         file_hash: string - the file hash
 *         file_raw_size: string - the original file size
 *         file_zkproof: string - the zero-knowledge proof of file
 *         file_encrypted_size: string - The size of the encrypted file
 *         category: string - the file category/type
 *         format: string - file format
 *         suffix: string - file suffix
 *         address: string - file address
 *         thumbnail: string - file thumbnail
 *         owner: string - file owner
 *         file_url: string - file storage url
 *         address: string - the file hash in backend
 *         owner_id: string - file owner's account ID
 *         owner_avatar: string - file owner's avatar
 *         created_at: number - file upload timestamp
 *         }]
 *      }
 * }
 */
export const getFileList = async (
    accountId:string, include:boolean, fileName: string, format:string, desc:boolean = false, pageNum:number, pageSize:number
): Promise<unknown> => {
    let result = await axios.post(getAgentBackendAddress() + '/file/others-list', {account_id: accountId, include: include, file_name: fileName, format:format, desc:desc, paginate: {page: pageNum, page_size: pageSize}})
    return result
};

/**
 * get file detail
 * @param fileId : string - the file id
 * @param fileUserAccountId  : string - The file user's account ID, which refers to the current user's account ID.
 * @return
 * {
 *   "code": 2000,
 *   "msg": "Success",
 *   "data":
 *      {
 *         file_name: string - File name
 *         file_hash: string - the file hash
 *         file_raw_size: string - the original file size
 *         file_zkproof: string - the zero-knowledge proof of file
 *         file_encrypted_size: string - The size of the encrypted file
 *         thumbnail: string - File thumbnail
 *         creator: string - Owner of the file (policy creator)
 *         creator_id: string - Owner ID of the file (policy creator ID)
 *         creator_avatar: string - Owner avatar of the file (policy creator avatar)
 *         creator_address: string - Ethereum address of the file owner (policy creator's address)
 *         file_created_at: number - File upload timestamp
 *         apply_id: number - Application record ID
 *         proposer_address: string - Ethereum address of the file user (policy user's address)
 *         status: number - Application status, 0: not applied, 1: applying, 2: approved, 3: rejected
 *         apply_start_at: string - Application start timestamp (policy start timestamp)
 *         apply_end_at: string - Application end timestamp (policy end timestamp)
 *         apply_created_at: string - Submit application timestamp
 *         policy_id: number - Policy ID
 *         hrac: string - Policy HRAC
 *         consumer: string - Policy user (applicant, file user)
 *         consumer_id: string - Policy user ID
 *         gas: string - Policy gas
 *         tx_hash: string - Policy transaction hash
 *         policy_created_at: string - Policy creation timestamp
 *         file_ipfs_address: string - File IPFS address
 *         policy_encrypted_pk: string - Encrypted public key of the policy
 *         encrypted_treasure_map_ipfs_address: string - Policy treasure map address
 *         alice_verify_pk: string - File owner's Verify public key
 *      }
 * }
 */
export const getFileDetail = async (
    fileId: string,
    fileUserAccountId: string
): Promise<unknown> => {
    const _chainId = await getNetWorkChainId();
    let result = await axios.post(getAgentBackendAddress() + '/file/detail', {consumer_id: fileUserAccountId, file_id: fileId, chain_id: _chainId})
    return result
};

/**
 * getSendApplyFiles
 * @param proposerId : string - Applicant's account ID
 * @param status : number - Application status 0:no distinction, 1: applying, 2: approved, 3: rejected, 4: in progress, 5: expired
 * @param pageNum : number - the page number
 * @param pageSize : number - the page size
 * @return
 * {
 *   "code": 2000,
 *   "msg": "Success",
 *   "data":
 *       {
 *         total: number
 *         list: [{
 *         file_id: string - the file ID
 *         file_name: string - the file name
 *         file_hash: string - the file hash
 *         file_raw_size: string - the original file size
 *         file_zkproof: string - the zero-knowledge proof of file
 *         file_encrypted_size: string - The size of the encrypted file
 *         category: string - the file category/type
 *         format: string - file format
 *         suffix: string - file suffix
 *         address: string - file address
 *         thumbnail: string - file thumbnail
 *         owner: string - file owner
 *         file_url: string - file storage url
 *         address: string - the file hash in backend
 *         owner_id: string - file owner's account ID
 *         owner_avatar: string - file owner's avatar
 *         created_at: number - file upload timestamp
 *         }]
 *      }
 * }
 */
export const getSendApplyFiles = async (proposerId: string, status:number = 0, pageNum: number, pageSize: number): Promise<unknown> => {
    const _chainId = await getNetWorkChainId();
    let result =  await axios.post(getAgentBackendAddress() + '/apply/list', {
        proposer_id: proposerId, status: status, paginate: {page: pageNum, page_size: pageSize}, chain_id: _chainId
    })
    return result
}

/**
 * get Incoming Apply Files
 * @param fileOwnerId : string - File owner's account ID
 * @param status : number - Application status 0:no distinction, 1: applying, 2: approved, 3: rejected, 4: in progress, 5: expired
 * @param pageNum : number - the page number
 * @param pageSize : number - the page size
 * @return {
 * {
 *   "code": 2000,
 *   "msg": "Success",
 *   "data":
 *       {
 *         total: number
 *         list: [{
 *         file_id: string - the file ID
 *         file_name: string - the file name
 *         file_hash: string - the file hash
 *         file_raw_size: string - the original file size
 *         file_zkproof: string - the zero-knowledge proof of file
 *         file_encrypted_size: string - The size of the encrypted file
 *         category: string - the file category/type
 *         format: string - file format
 *         suffix: string - file suffix
 *         address: string - file address
 *         thumbnail: string - file thumbnail
 *         owner: string - file owner
 *         file_url: string - file storage url
 *         address: string - the file hash in backend
 *         owner_id: string - file owner's account ID
 *         owner_avatar: string - file owner's avatar
 *         created_at: number - file upload timestamp
 *         }]
 *      }
 * }
 */
export const getIncomingApplyFiles = async (fileOwnerId: string, status:number = 0, pageNum: number, pageSize: number): Promise<unknown> => {
    const _chainId = await getNetWorkChainId();
    let result = await axios.post(getAgentBackendAddress() + '/apply/list', {
        file_owner_id: fileOwnerId, status: status, paginate: {page: pageNum, page_size: pageSize}, chain_id: _chainId
    })
    return result
}

/**
 *  get Ursula Number
 *  @return number
 */
export const getUrsulaNumber = async () => {
    let result = await axios.get(getStakingServiceAddress() + '/includeUrsula/getUrsulaNum')
    let stakingUrsulaNum = 0
    if (result['code'] == 0){
        stakingUrsulaNum = result.data
    }
    let porterResult = await axios.post(getPorterServiceAddress() + '/include/ursulas', {})
    let porterUrsulaNum = porterResult['result'].total;
    let ursulaNum = stakingUrsulaNum > porterUrsulaNum?porterUrsulaNum:stakingUrsulaNum
    ursulaNum = Math.min(5,Math.floor(ursulaNum/5))
    ursulaNum = ursulaNum == 0?1:ursulaNum
    return ursulaNum
}
/**
 * sendCustomTransaction
 * @param toAddress : string - The recevier of the transaction.
 * @param rawTxData : string - The call data of the transaction, can be empty for simple value transfers.
 * @param value :  string - The value of the transaction in wei.
 * @param gasPrice :  string - The gas price set by this transaction, if empty, it will use web3.eth.getGasPrice()
 * @param callBackFunc : CallBackFunc - A callback function that will be called with the response data from the server.
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
