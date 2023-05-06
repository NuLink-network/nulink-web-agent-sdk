
export type requisiteQueryData = {
    accountAddress: string | null
    accountId: string | null
    redirectUrl: string
}

export type decryptionRequestData = {
    accountAddress: string
    accountId: string
    redirectUrl: string
    fileId: string
    fileName: string
    from: string
    to: string
    publicKey: string
}

export type applyRequestData = {
    accountAddress: string
    accountId: string
    redirectUrl: string
    fileName: string
    fileId: string
    owner: string
    user: string
    days: number
}

export type approveRequestData = {
    accountAddress: string | null
    accountId: string | null
    redirectUrl: string
    sourceUrl: string
    from: string | null
    to: string
    applyId: string
    days: string
    remark: string
    userAccountId: string
}


export type requisiteApproveData = {
    accountAddress: string
    accountId: string
    redirectUrl: string
    sourceUrl: string
}

export type approveResponseData = {
    accountAddress: string
    accountId: string
    action: string
    subAction?: string
    from: string
    to: string
    applyId: string
    result: string
    redirectUrl: string
}

export type uploadResponseData = {
    accountAddress: string
    accountId: string
    action: string
    subAction?: string
    result: string
    redirectUrl: string
}

export type applyResponseData = {
    accountAddress: string
    accountId: string
    action: string
    subAction?: string
    owner: string
    user: string
    result: string
    redirectUrl: string
}

export type loginResponseData = {
    accountAddress: string
    accountId: string
    action: string
    result: string
    redirectUrl: string
}

export type decryptionResponseData = {
    accountAddress: string
    accountId: string
    fileName: string
    action: string
    subAction?: string
    result: string
    redirectUrl: string
    url?: string
}


export type ApplyInfo = {
    fileName: string
    fileId: string
    fileCreatorAddress: string
    usageDays: number
}
