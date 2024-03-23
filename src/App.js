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
import { ToastContainer, toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";

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

const polygonEvmConfig = {
  higherSwap: "",
  pair: "0xEce7244a0e861C841651401fC22cEE577fEE90AF",
  router: "0xADa6e69781399990d42bEcB1a9427955FFA73Bdc",
  tokenOut: "0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035",
  fullfillToken0: false,
}

const lineaConfig = {
  higherSwap: "",
  pair: "0xCeC911f803D984ae2e5A134b2D15218466993869",
  router: "0xa33E48EF82e697143208254FDe53Bf624f2C87E4",
  tokenOut: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
  fullfillToken0: true,
}

const timeSelectOption = [
  { value: 86400, label: "1 day" },
  { value: 86400 * 3, label: "3 days" },
  { value: 86400 * 7, label: "7 days" },
  { value: 86400 * 30, label: "30 days" },
];

function App() {
  // TODO: change config based on connected chain
  const { address, chainId, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const [amountIn, setAmountIn] = useState(0);
  const [amountOut, setAmountOut] = useState(0n);
  const [limitOrderAmountOut, setLimitOrderAmountOut] = useState(0n);

  const [reserves, setReserves] = useState([0n, 0n]);
  const [premium, setPremium] = useState(0n);
  const [timeSelect, setTimeSelect] = useState(timeSelectOption[0]);
  const [position, setPosition] = useState()
  const [isLoading, setIsLoading] = useState(false)
  const isButtonDisabled = parseFloat(amountIn) > 0.00001

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
          <span style={{marginLeft: "10px"}}>ETH</span>
        </div>
        <div style={{marginBottom: "20px"}}>
          {
            "Swap ETH amount should <= 0.00001 to prevent the insufficent liquidity"
          }
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
            <span style={{margin: "10px"}}>USDC</span>
            <button
              style={{
                backgroundColor: "#008CBA",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                opacity: isButtonDisabled ? 0.4 : 1
              }}
              onClick={async () => {
                setIsLoading(true)
                try {
                  const ethersProvider = new providers.Web3Provider(walletProvider);
                  const signer = await ethersProvider.getSigner();

                  const router = new Contract(sepoliaConfig.router, routerABI, signer)
                  let tx = await router.swapETHIn(sepoliaConfig.tokenOut, 1, await  signer.getAddress(), 0, {value: utils.parseEther(amountIn)})
                  await ethersProvider.waitForTransaction(tx.hash)
                  toast.success("Swap success")
                } catch (e) {

                }
                setIsLoading(false)
              }}
              disabled={isButtonDisabled}
            >
              {isLoading ? <ClipLoader size={10}/> : "Swap Now"}
            </button>
          </div>
          <div>
            <input
              type="number"
              value={utils.formatUnits(limitOrderAmountOut, "6")}
              disabled={true}
            />
            <span style={{margin: "10px"}}>USDC</span>
            <button
              style={{
                backgroundColor: "#008CBA",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                opacity: isButtonDisabled ? 0.4 : 1
              }}
              onClick={async () => {
                setIsLoading(true)
                try {
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
                toast.success("Place limit order success")
                } catch (e) {

                }
                setIsLoading(false)
              }}
              disabled={isButtonDisabled}
            >
              {isLoading ? <ClipLoader size={10}/> : "Place Limit Order"}
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
          <div style={{margin: "20px"}}>
            Your Position
          </div>
          
          {position && <div style={{}}>
            <div>
              <div>
                {`ETH amount: ${utils.formatEther(position.ethAmount)}`}
              </div>
              <div>
                {`USDC amount: ${utils.formatUnits(position.usdcAmount, "6")}`}
              </div>
              <div>
                {`due time ${position.due.toLocaleString()}`}
              </div>
            </div>
            <div>
            <button
              style={{
                backgroundColor: "red",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={async () => {
                setIsLoading(true)
                try {
                  const ethersProvider = new providers.Web3Provider(walletProvider);
                const signer = await ethersProvider.getSigner();
            
                const higherSwap = new Contract(sepoliaConfig.higherSwap,higherSwapABI, signer)
                // function fullfillNote(address noteOwner, uint index, address fullfillTokenAddress, bool fullfillToken0)
                let tx = await higherSwap.fullfillNote(
                  await signer.getAddress(),
                  position.positionIndex,
                  sepoliaConfig.tokenOut,
                  sepoliaConfig.fullfillToken0,
                )
                await ethersProvider.waitForTransaction(tx.hash)
                toast.success("Fullfill order success")
                setPosition(null)
                } catch (e) {

                }
                setIsLoading(false)
              }}
            >
              {isLoading ? <ClipLoader size={10}/> : "Fullfill order only for Demo purpose"}
            </button>
            </div>
            
          </div>}
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App;
