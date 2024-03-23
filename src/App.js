import logo from "./logo.svg";
import "./App.css";

import {
  createWeb3Modal,
  defaultConfig,
  useWeb3ModalAccount,
  useWeb3ModalProvider,
} from "@web3modal/ethers5/react";
import { providers, Contract, utils } from "ethers";
import { useState, useEffect } from "react";
import pairABI from "./pairABI.json";
import routerABI from "./routerABI.json";
import higherSwapABI from "./higherSwapABI.json";
import {
  calcSwappedAmount,
} from "@dyson-finance/dyson-interface-sdk/calculations";

// 1. Get projectId
const projectId = "dd11e7011e27d464fe707b82313e7879";

// 2. Set chains
const sepolia = {
  chainId: 11155111,
  name: "Sepolia",
  currency: "ETH",
  explorerUrl: "https://etherscan.io",
  rpcUrl: "https://cloudflare-eth.com",
};

// 3. Create a metadata object
const metadata = {
  name: "My Website",
  description: "My Website description",
  url: window.location.href, // origin must match your domain & subdomain
  icons: ["https://avatars.mywebsite.com/"],
};

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  /*Required*/
  metadata,
});

// 5. Create a Web3Modal instance
createWeb3Modal({
  ethersConfig,
  chains: [sepolia],
  projectId,
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
});

const sepoliaConfig = {
  higherSwap: "0x8bbd0d093b597d87c9444796bcd5f0b439c905bd",
  pair: "0xa28d7Dd51144426557afF3Db67d285d76c127d20",
  router: "0x0e802cabd4c20d8a24a2c98a4da176337690cc0d",
  tokenOut: "0xFA0bd2B4d6D629AdF683e4DCA310c562bCD98E4E",
  fullfillToken0: false,
}

function App() {
  const { address, chainId, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const [amountIn, setAmountIn] = useState(0);
  const [amountOut, setAmountOut] = useState(0n);
  const [limitOrderAmountIn, setLimitOrderAmountIn] = useState(0)
  const [limitOrderAmountOut, setLimitOrderAmountOut] = useState(0n)

  const [reserves, setReserves] = useState([0n, 0n]);
  const [premium, setPremium] = useState(0n)

  const fetchPairInfo = async () => {
    const ethersProvider = new providers.Web3Provider(walletProvider);
    const signer = await ethersProvider.getSigner();

    const pair = new Contract(
      sepoliaConfig.pair,
      pairABI,
      signer
    );
    const pairReserves = await pair.getReserves();
    console.log("pairReserves", pairReserves);
    setReserves([pairReserves[0].toBigInt(), pairReserves[1].toBigInt()]);

    const premium = await pair.getPremium(86400)
    console.log("premium",premium)
    setPremium(premium.toBigInt())
  };

  useEffect(() => {
    if (walletProvider) {
      fetchPairInfo();
    }
  }, [walletProvider]);
  return (
    <div className="App">
      <w3m-button />
      <div>
        Swap
        <div>
          ETH
          <input
            type="number"
            onChange={(e) => {
              try {
                const inputString = e.target.value.startsWith(".")
                ? `0${e.target.value}`
                : e.target.value;
              setAmountIn(inputString);

              const swapOutput = calcSwappedAmount(
                utils.parseEther(inputString).toBigInt(),
                reserves[0],
                reserves[1],
                0n
              );
              console.log("swapOutput", swapOutput);
              setAmountOut(swapOutput);
              } catch (e) {

              }
              
            }}
            value={amountIn}
            placeholder="0.1"
            autoFocus
          />
        </div>
        <div>
          USDC
          {utils.formatUnits(amountOut, "6")}
        </div>
        <button onClick={async () => {
          const ethersProvider = new providers.Web3Provider(walletProvider);
          const signer = await ethersProvider.getSigner();
      
          const router = new Contract(
            sepoliaConfig.router,
            routerABI,
            signer
          );
        }}>Swap</button>
      </div>


      <div>
        Limit Order
        <div>
          ETH
          <input
            type="number"
            onChange={(e) => {
              try {
                const inputString = e.target.value.startsWith(".")
                ? `0${e.target.value}`
                : e.target.value;
              setLimitOrderAmountIn(inputString);

              const swapOutput = calcSwappedAmount(
                utils.parseEther(inputString).toBigInt(),
                reserves[0],
                reserves[1],
                0n
              );
              console.log("limit order swap output", swapOutput);
              const swapOutputWithPremium = swapOutput * (premium + utils.parseEther("1").toBigInt()) / utils.parseEther("1").toBigInt()
              console.log("swapOutputWithPremium",swapOutputWithPremium)
              setLimitOrderAmountOut(swapOutputWithPremium);
              } catch (e) {

              }
              
            }}
            value={limitOrderAmountIn}
            placeholder="0.1"
            autoFocus
          />
        </div>
        <div>
          USDC
          {utils.formatUnits(limitOrderAmountOut, "6")}
        </div>
        <button onClick={async () => {
          const ethersProvider = new providers.Web3Provider(walletProvider);
          const signer = await ethersProvider.getSigner();
      
          const higherSwap = new Contract(sepoliaConfig.higherSwap,higherSwapABI, signer)
          // function depositTo(address router, address pair, address tokenOut, uint index, address to, uint minOutput, uint time)
          await higherSwap.depositTo(
            sepoliaConfig.router,
            sepoliaConfig.pair,
            sepoliaConfig.tokenOut,
            1,
            sepoliaConfig.higherSwap,
            0,
            86400,
            {value: utils.parseEther("0.00001")}
          )
        }}>Place Limit Order</button>
        <button onClick={async () => {
          const ethersProvider = new providers.Web3Provider(walletProvider);
          const signer = await ethersProvider.getSigner();
      
          const higherSwap = new Contract(sepoliaConfig.higherSwap,higherSwapABI, signer)
          // function fullfillNote(address noteOwner, uint index, address fullfillTokenAddress, bool fullfillToken0)
          await higherSwap.fullfillNote(
            await signer.getAddress(),
            0,
            sepoliaConfig.tokenOut,
            sepoliaConfig.fullfillToken0,
          )
        }}>fullfill</button>
      </div>
    </div>
  );
}

export default App;
