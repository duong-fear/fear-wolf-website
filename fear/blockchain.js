const ETHEREUM_CHAINID = 1;
const KOVAN_CHAINID = 42;
const RINKEBY_CHAINID = 4
const DEFAULT_CHAINID = ETHEREUM_CHAINID;

const CHAINS = [
    {
        mainnet: true,
        chainId: `0x${ETHEREUM_CHAINID.toString(16)}`,
        rpc: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        name: "Ethereum Mainnet",
        shortName: "eth",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
        },
        blockExplorer: "https://etherscan.io",
    },
    // {
    //     mainnet: true,
    //     chainId: `0x${RINKEBY_CHAINID.toString(16)}`,
    //     rpc: "https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    //     name: "Rinkeby Testnet",
    //     shortName: "eth",
    //     nativeCurrency: {
    //         name: "Ether",
    //         symbol: "ETH",
    //         decimals: 18,
    //     },
    //     blockExplorer: "https://rinkeby.etherscan.io",
    // },
    {
        mainnet: false,
        chainId: `0x${KOVAN_CHAINID.toString(16)}`,
        rpc: "https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        name: "Kovan Testnet",
        shortName: "eth",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
        },
        blockExplorer: "https://kovan.etherscan.io",
    },
];

const SUPPORTED_CHAINS = CHAINS.map((c) => +c.chainId);

const fear = {
    wolfDistribution: {
        [KOVAN_CHAINID]: {
            address: "0x1403838A3C799462D657410EaE214c359d4e995f",
            abi: fearWolfDistributorABI,
        },
        [ETHEREUM_CHAINID]: {
            address: "0x8be7dbc73a9e1bb40d1d7741783b0a8fa003acf7",
            abi: fearWolfDistributorABI,
        },
        get address() {
            return this[blockchain.chainId].address;
        },
        get abi() {
            return this[blockchain.chainId].abi;
        },
        get instance() {
            const instance = new ethers.Contract(
                this.address,
                this.abi,
                blockchain.signer || blockchain.provider
            );
            return instance;
        },
    },
};

let blockchain = {
    chainId: DEFAULT_CHAINID,
    _provider: null,
    signer: null,
    get provider() {
        if (this._provider) return this._provider;
        const rpcUrl = CHAINS.find((c) => c.chainId == blockchain.chainId).rpc;
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        return provider;
    },
    set provider(_) {
        this._provider = _;
    },

    connectWallet: async function (callback) {
        notify();
        const vm = Alpine.store("vm");
        vm.loading.CONNECT_WALLET = true;
        try {
            const providerOptions = {
                walletconnect: {
                    package: WalletConnectProvider,
                    options: {
                        infuraId: "9aa3d95b3bc440fa88ea12eaa4456161",
                    }
                },
            };
            const web3Modal = new Web3Modal({
                cacheProvider: false,
                providerOptions,
                disableInjectedProvider: false,
            });
            const provider = await web3Modal.connect();
            // if (!await getWeb3ActiveAddress(provider)) {
            //     await ethereum.request({ method: "eth_requestAccounts" });
            // }
            const web3Provider = new ethers.providers.Web3Provider(
                provider,
                "any"
            );
            const address = await getWeb3ActiveAddress(provider);
            if (+web3Provider.provider.chainId != DEFAULT_CHAINID) {
                notifyError(`Please switch your network to ${CHAINS.find(c => +c.chainId == DEFAULT_CHAINID).name}`);
                try {
                    await blockchain.switchToChosenNetwork(web3Provider, DEFAULT_CHAINID);
                }
                catch(error) {
                    console.error(getExceptionMsg(error));
                    return;
                }
            }
            web3Provider.provider.on("chainChanged", async (...params) => {
                console.info("chainChanged", params);
                const chainId = +params[0];
                if(chainId == DEFAULT_CHAINID) return;
                if(blockchain.provider.isWalletConnect) {
                    return await blockchain.provider.close();
                }
                window.location.reload();
            });
            web3Provider.provider.on("accountsChanged", async (...params) => {
                console.info("accountsChanged", params);
                if(address == params[0].shift()) return;
                if(blockchain.provider.isWalletConnect) {
                    return await blockchain.provider.close();
                }
                window.location.reload();
            });
            web3Provider.provider.on("disconnect", (...params) => { // wallet connect
                console.info("disconnect", params);
                window.location.reload();
            });
            blockchain.provider = web3Provider.provider;
            blockchain.signer = web3Provider.getSigner();
            vm.isMetaMask = blockchain.provider.isMetaMask;
            vm.isWalletConnect = blockchain.provider.isWalletConnect;
            if(typeof callback == 'function') await callback();
            vm.wallet = address;
            notifySuccess("Wallet connected!");
        }
        catch (err) {
            const errMsg = getExceptionMsg(err);
            notifyError(errMsg);
        }
        finally {
            vm.loading.CONNECT_WALLET = false;
        }
    },

    reserveWolves: async () => {
        const vm = Alpine.store("vm");
        const amount = +vm.preSaleBuyAmount;
        const isValidAmount = amount >= 1 && amount <= 5;
        notify();
        try {
            vm.loading.RESERVE_WOLF = true;
            await Promise.all([
                fetchWolfSaleStats(),
                fetchUserStats(false),
            ]);
            if(vm.preSaleRemain == 0) throw new Error("INO Sale has sold out");
            if(!isValidAmount) throw new Error(`Invalid buy amount: ${amount}`);
            if(amount > vm.preSaleRemain) throw new Error(`Not enough wolves left`);
            const etherAmount = vm.preSalePriceBN.mul(amount);
            if(vm.etherBalanceBN.lt(etherAmount)) {
                throw new Error(`Insufficient ETH balance. Need ${formatEther(etherAmount)} ETH.`);
            }
            vm.loading.MODAL = `Reserving ${amount} ${amount > 1 ? 'Wolves' : 'Wolf'} ...`;
            const tx = await fear.wolfDistribution.instance.reserveWolves(
                amount,
                {
                    value: etherAmount,
                }
            );
            await tx.wait();
            await Promise.all([
                fetchWolfSaleStats(),
                fetchUserStats(),
            ]);
            notifySuccess(`${amount} ${amount > 1 ? 'Wolves' : 'Wolf'} reserved 🎉`);
        } catch (err) {
            const errMsg = getExceptionMsg(err);
            if(errMsg == "execution reverted: Pausable: paused") {
                notifyError("INO Sale is not active at the moment");
            }
            else {
                notifyError(errMsg);
            }
        } finally {
            scroll2Top();
            window.vm.loading.RESERVE_WOLF = false;
            window.vm.loading.MODAL = null;
        }
    },

    buyWolves: async () => {
        const vm = Alpine.store("vm");
        const amount = +vm.publicSaleBuyAmount;
        const isValidAmount = amount >= 1 && amount <= 10;
        notify();
        try {
            vm.loading.BUY_WOLF = true;
            await Promise.all([
                fetchWolfSaleStats(),
                fetchUserStats(false),
            ]);
            if(vm.publicSaleRemain == 0) throw new Error("Public Sale has sold-out");
            if(amount > vm.publicSaleRemain) throw new Error("Not enough wolves left");
            if(!isValidAmount) throw new Error(`Invalid buy amount: ${amount}`);
            const etherAmount = vm.publicSalePriceBN.mul(amount);
            if(vm.etherBalanceBN.lt(etherAmount)) {
                throw new Error(`Insufficient ETH balance. Need ${formatEther(etherAmount)} ETH.`);
            }
            vm.loading.MODAL = `Buying ${amount} ${amount > 1 ? 'Wolves' : 'Wolf'} ...`;
            const tx = await fear.wolfDistribution.instance.buyWolves(
                amount,
                {
                    value: etherAmount,
                }
            );
            await tx.wait();
            await Promise.all([
                fetchWolfSaleStats(),
                fetchUserStats(),
            ]);
            notifySuccess(`${amount} ${amount > 1 ? 'Wolves' : 'Wolf'} bought 🎉✨`);
        } catch (err) {
            const errMsg = getExceptionMsg(err);
            if(errMsg == "execution reverted: Pausable: paused") {
                notifyError("Public Sale is not active at the moment");
            }
            else {
                notifyError(errMsg);
            }
        } finally {
            scroll2Top();
            vm.loading.BUY_WOLF = false;
            vm.loading.MODAL = null;
        }
    },

    claimWolves: async () => {
        const vm = Alpine.store("vm");
        try {
            vm.loading.CLAIM_WOLF = true;
            await Promise.all([
                fetchWolfSaleStats(),
                fetchUserStats(),
            ]);
            if(vm.claimed > 0 || vm.reserved == 0) throw new Error("No wolves left to claim");
            const amount = vm.reserved;
            vm.loading.MODAL = `Claiming ${amount} ${amount == 1 ? 'Wolf' : 'Wolves'} ...`;
            const tx = await fear.wolfDistribution.instance.claimWolves();
            await tx.wait();
            await Promise.all([
                fetchWolfSaleStats(),
                fetchUserStats(),
            ]);
            notifySuccess(`${amount} ${amount == 1 ? 'Wolf' : 'Wolves'} claimed 🎉✨`);
        } catch (err) {
            const errMsg = getExceptionMsg(err);
            notifyError(errMsg);
        } finally {
            vm.loading.CLAIM_WOLF = false;
            vm.loading.MODAL = null;
        }
    },

    switchToChosenNetwork: async function (web3Provider, chainId) {
        try {
            await web3Provider.provider.request({
                method: "wallet_switchEthereumChain",
                params: [
                    { chainId: `0x${chainId.toString(16)}` },
                ],
            });
        } catch (e) {
            let network = CHAINS.find((c) => +c.chainId == +chainId);
            const params = [
                {
                    chainId: network.chainId,
                    chainName: network.name,
                    nativeCurrency: network.nativeCurrency,
                    rpcUrls: [network.rpc],
                    blockExplorerUrls: [network.blockExplorer],
                },
            ];
            if (e.code === 4902) {
                await web3Provider.provider.request({
                    method: "wallet_addEthereumChain",
                    params
                });
                await web3Provider.provider.request({
                    method: "wallet_switchEthereumChain",
                    params: [
                        { chainId: `0x${chainId.toString(16)}` },
                    ]
                });
                return;
            }
            throw e;
        }
    },

    startEventListener: () => {
        const vm = Alpine.store("vm");
        fear.wolfDistribution.instance.on("WolvesReserved", async (...params) => {
            console.info("WolvesReserved", params);
            const [
                preSaleRemainBN,
                totalReservedBN,
            ] = await Promise.all([
                fear.wolfDistribution.instance.getPresaleWolvesAvailable(),
                fear.wolfDistribution.instance.totalWolvesReserved(),
            ]);
            Object.assign(vm, {
                preSaleRemain: Math.min(preSaleRemainBN.toNumber(), vm.preSaleRemain),
                totalReserved: Math.max(totalReservedBN.toNumber(), vm.totalReserved),
            });
        });
        fear.wolfDistribution.instance.on("WolvesBought", async (...params) => {
            console.info("WolvesBought", params);
            const [
                publicSaleRemainBN,
                totalBoughtBN,
            ] = await Promise.all([
                fear.wolfDistribution.instance.getPublicSaleWolvesAvailable(),
                fear.wolfDistribution.instance.totalWolvesBought(),
            ]);
            Object.assign(vm, {
                publicSaleRemain: Math.min(publicSaleRemainBN.toNumber(), vm.publicSaleRemain),
                totalBought: Math.max(totalBoughtBN.toNumber(), vm.totalBought),
            });
        });
    },
};
