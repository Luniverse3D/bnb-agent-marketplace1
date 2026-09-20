import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc, bscTestnet } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Agent Marketplace',
  projectId: 'e92a2a1641164d4e18484b6a77b8c776',
  chains: [bsc, bscTestnet],
  ssr: true,
});