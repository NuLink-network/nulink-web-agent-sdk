export const nulink_agent_config = {
    address: process.env.REACT_APP_NULINK_AGENT_URL as string || 'https://agent.testnet.nulink.org',
    backend_address: process.env.REACT_APP_CENTRALIZED_SERVER_URL as string || 'https://agent-integration-demo.nulink.org/bk',
    chain_id: process.env.REACT_APP_DEFAULT_NETWORK_CHAIN_ID as string || 97,
    staking_service_url: process.env.REACT_APP_STAKING_SERVICE_URL as string || 'https://staking-api.testnet.nulink.org',
    porter_url: process.env.REACT_APP_BSC_TESTNET_PORTER_URL as string || 'https://porter-api.testnet.nulink.org'
}
