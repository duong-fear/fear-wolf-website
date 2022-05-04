const ETHEREUM_CHAINID = 1;
const KOVAN_CHAINID = 42;
const RINKEBY_CHAINID = 4
const DEFAULT_CHAINID = KOVAN_CHAINID;

const CHAINS = [
    // {
    //     mainnet: true,
    //     chainId: `0x${ETHEREUM_CHAINID.toString(16)}`,
    //     rpc: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    //     name: "Ethereum Mainnet",
    //     shortName: "eth",
    //     nativeCurrency: {
    //         name: "Ether",
    //         symbol: "ETH",
    //         decimals: 18,
    //     },
    //     blockExplorer: "https://etherscan.io",
    // },
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
].filter(
    (c) => c.mainnet == true || !window.location.hostname.endsWith(".fear.io")
);

const SUPPORTED_CHAINS = CHAINS.map((c) => +c.chainId);

const fear = {
    wolfDistribution: {
        [KOVAN_CHAINID]: {
            // address: "0x352D1BB819f55232A7D463868D562af8756D54EB",
            address: "0x1F20152E230bf714a739c16a674E730a2aCaC5eb",
            abi: fearWolfDistributorABI,
        },
        // [RINKEBY_CHAINID]: {
        //     address: "0xf4797e49BDb3C89616dFf840f8584d4C6422813d",
        //     abi: fearWolfDistributorABI,
        // },
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
    address: null,
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

    connectMetamask: async function (callback) {
        notify();
        const vm = Alpine.store("vm");
        vm.loading.CONNECT_WALLET = true;
        try {
            if (!await getWeb3ActiveAddress()) {
                await ethereum.request({ method: "eth_requestAccounts" });
            }
            const web3Provider = new ethers.providers.Web3Provider(
                window.ethereum,
                "any"
            );
            if (!SUPPORTED_CHAINS.includes(+web3Provider.provider.chainId)) {
                await blockchain.switchToChosenNetwork(web3Provider, DEFAULT_CHAINID);
                window.location.reload();
                return;
            }
            web3Provider.provider.on("chainChanged", () => {
                window.location.reload();
            });
            web3Provider.provider.on("accountsChanged", () => {
                window.location.reload();
            });
            blockchain.provider = web3Provider.provider;
            blockchain.signer = web3Provider.getSigner();
            vm.wallet = await getWeb3ActiveAddress();
            if(typeof callback == 'function') await callback();
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

    reserveWolves: async (_amount) => {
        const amount = +_amount;
        const vm = Alpine.store("vm");
        notify();
        try {
            vm.loading.RESERVE_WOLF = true;
            await Promise.all([
                fetchWolfSaleStats(),
                fetchUserStats(),
            ]);
            if(vm.preSaleRemain == 0) throw new Error("Pre-sale has sold out");
            if(amount < 1 || amount > 5) throw new Error(`Invalid buy amount: ${amount}`);
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
            notifyError(errMsg);
        } finally {
            scroll2Top();
            window.vm.loading.RESERVE_WOLF = false;
            window.vm.loading.MODAL = null;
        }
    },

    buyWolves: async (_amount) => {
        const amount = +_amount;
        const vm = Alpine.store("vm");
        notify();
        try {
            vm.loading.BUY_WOLF = true;
            await Promise.all([
                fetchWolfSaleStats(),
                fetchUserStats(),
            ]);
            if(vm.publicSaleRemain == 0) throw new Error("Public-sale has sold-out");
            if(amount > vm.publicSaleRemain) throw new Error("Not enought Wolves in pool to buy");
            if(amount < 1 || amount > 10) throw new Error(`Invalid buy amount: ${amount}`);
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
            notifyError(errMsg);
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
            await web3Provider.provider.send("wallet_switchEthereumChain", [
                { chainId: `0x${chainId.toString(16)}` },
            ]);
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
                await web3Provider.provider.send(
                    "wallet_addEthereumChain",
                    params
                );
                await web3Provider.provider.send("wallet_switchEthereumChain", [
                    { chainId: `0x${chainId.toString(16)}` },
                ]);
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
