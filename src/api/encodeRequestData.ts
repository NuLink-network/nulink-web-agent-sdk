import { encrypt } from "../utils/crypto"
import {
    applyRequestData,
    applyResponseData, approveRequestData,
    decryptionRequestData,
    requisiteApproveData,
    requisiteQueryData
} from "../types/index";

export const encodeRequestData = (requestData:decryptionRequestData | requisiteApproveData |
    applyResponseData | applyRequestData | approveRequestData |
    requisiteQueryData | string, secret: string ) => {
    return encrypt(JSON.stringify(requestData), secret)
}
