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
import { calcSwappedAmount } from "@dyson-finance/dyson-interface-sdk/calculations";
import Select from "react-select";

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
};

const timeSelectOption = [
  { value: 86400, label: "1 day" },
  { value: 86400 * 3, label: "3 days" },
  { value: 86400 * 7, label: "7 days" },
  { value: 86400 * 30, label: "30 days" },
];

function App() {
  const { address, chainId, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const [amountIn, setAmountIn] = useState(0);
  const [amountOut, setAmountOut] = useState(0n);
  // const [limitOrderAmountIn, setLimitOrderAmountIn] = useState(0);
  const [limitOrderAmountOut, setLimitOrderAmountOut] = useState(0n);

  const [reserves, setReserves] = useState([0n, 0n]);
  const [premium, setPremium] = useState(0n);
  const [timeSelect, setTimeSelect] = useState(timeSelectOption[0]);
  const [position, setPosition] = useState()

  const fetchPairInfo = async () => {
    const ethersProvider = new providers.Web3Provider(walletProvider);
    const signer = await ethersProvider.getSigner();

    const pair = new Contract(sepoliaConfig.pair, pairABI, signer);
    const pairReserves = await pair.getReserves();
    console.log("pairReserves", pairReserves);
    setReserves([pairReserves[0].toBigInt(), pairReserves[1].toBigInt()]);

    const premium = await pair.getPremium(timeSelect.value);
    console.log("premium", premium);
    setPremium(premium.toBigInt());
  };

  const updatePremium = async () => {
    const ethersProvider = new providers.Web3Provider(walletProvider);
    const signer = await ethersProvider.getSigner();

    const pair = new Contract(sepoliaConfig.pair, pairABI, signer);
    const premium = await pair.getPremium(timeSelect.value);
    setPremium(premium.toBigInt());
  };

  useEffect(() => {
    if (walletProvider) {
      fetchPairInfo();
    }
  }, [walletProvider]);

  useEffect(() => {
    try {
      const swapOutput = calcSwappedAmount(
        utils.parseEther(amountIn).toBigInt(),
        reserves[0],
        reserves[1],
        0n
      );
      setAmountOut(swapOutput);
      console.log("limit order swap output", swapOutput);
      const swapOutputWithPremium =
        (swapOutput * (premium + utils.parseEther("1").toBigInt())) /
        utils.parseEther("1").toBigInt();
      console.log("swapOutputWithPremium", swapOutputWithPremium);
      setLimitOrderAmountOut(swapOutputWithPremium);
    } catch (e) {}
  }, [amountIn, premium]);

  useEffect(() => {
    updatePremium();
  }, [timeSelect]);
  return (
    <div className="App">
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        <w3m-button />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1>Higher Swap</h1>
        <div>
          <input
            style={{
              padding: "10px",
              backgroundColor: "#f0f0f0",
              width: "300px",
              border: "none",
              borderRadius: "4px",
              marginBottom: "10px",
            }}
            type="number"
            onChange={(e) => {
              try {
                const inputString = e.target.value.startsWith(".")
                  ? `0${e.target.value}`
                  : e.target.value;
                  setAmountIn(inputString);
              } catch (e) {}
            }}
            value={amountIn}
            placeholder="0.00001"
            autoFocus
          />
          ETH
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            gap: "20px",
          }}
        >
          <div>
            <input
              type="number"
              value={utils.formatUnits(amountOut, "6")}
              disabled={true}
            />
            <button
              style={{
                backgroundColor: "#008CBA",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={async () => {
                const ethersProvider = new providers.Web3Provider(walletProvider);
                const signer = await ethersProvider.getSigner();

                const router = new Contract(sepoliaConfig.router, routerABI, signer)
                await router.swapETHIn(sepoliaConfig.tokenOut, 1, await  signer.getAddress(), 0, {value: utils.parseEther(amountIn)})
              }}
            >
              Swap Now
            </button>
          </div>
          <div>
            <input
              type="number"
              value={utils.formatUnits(limitOrderAmountOut, "6")}
              disabled={true}
            />
            <button
              style={{
                backgroundColor: "#008CBA",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={async () => {
                const ethersProvider = new providers.Web3Provider(walletProvider);
                const signer = await ethersProvider.getSigner();
            
                const higherSwap = new Contract(sepoliaConfig.higherSwap,higherSwapABI, signer)
                const pair = new Contract(sepoliaConfig.pair,pairABI, signer)
                // function depositTo(address router, address pair, address tokenOut, uint index, address to, uint minOutput, uint time)
                let tx = await higherSwap.depositTo(
                  sepoliaConfig.router,
                  sepoliaConfig.pair,
                  sepoliaConfig.tokenOut,
                  1,
                  sepoliaConfig.higherSwap,
                  0,
                  timeSelect.value,
                  {value: utils.parseEther(amountIn)}
                )
                let receipt = await ethersProvider.waitForTransaction(tx.hash)
                console.log("receipt",receipt)
                
                let result = pair.interface.parseLog(receipt.logs[1])
                setPosition({
                  ethAmount: result.args.token0Amt,
                  usdcAmount: result.args.token1Amt,
                  due: new Date(Number(result.args.due) * 1000),
                  positionIndex: result.args.index
                })
                console.log(result)
              }}
            >
              {`Place Limit Order`}
            </button>
            <div>
              {`get ${
                Number(
                  (premium * utils.parseUnits("1", "6").toBigInt()) /
                    utils.parseEther("1").toBigInt()
                ) / 10000
              }% extra reward after`}
              <Select
                options={timeSelectOption}
                value={timeSelect}
                onChange={(e) => {
                  setTimeSelect(e);
                }}
              />
            </div>
          </div>
        </div>
        <div>
          Your Position
          {position && <div style={{}}>
            <div>
              {`ETH amount: ${utils.formatEther(position.ethAmount)}`}
            </div>
            <div>
              {`USDC amount: ${utils.formatUnits(position.usdcAmount, "6")}`}
            </div>
            <div>
              {`due time ${position.due.toLocaleString()}`}
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

export default App;
