export const nulink_agent_config = {
    address: process.env.REACT_APP_NULINK_AGENT_URL || 'https://agent.testnet.nulink.org',
    backend_address: process.env.REACT_APP_CENTRALIZED_SERVER_URL || 'https://agent-integration-demo.nulink.org/bk',
    chain_id: process.env.REACT_APP_DEFAULT_NETWORK_CHAIN_ID || 97
}
