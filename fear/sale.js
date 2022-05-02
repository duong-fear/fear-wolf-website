const fetchWolfSaleStats = async () => {
    const [
        wsStartEpochBN,
        asStartEpochBN,
        preSaleStartEpochBN,
        publicSaleStartEpochBN,
        claimingStartEpochBN,

        preSaleRemainBN,
        preSalePriceBN,
        preSaleLimitBN,

        totalReservedBN,
        totalBoughtBN,

        publicSaleRemainBN,
        publicSalePriceBN,
        publicSalePriceMinBN,
        publicSalePriceMaxBN,

        initialPreSaleAmountBN,
        initialPublicSaleAmountBN,
    ] = await Promise.all([
        fear.wolfDistribution.instance.whitelistedPresaleStart(),
        fear.wolfDistribution.instance.affiliatedPresaleStart(),
        fear.wolfDistribution.instance.publicPresaleStart(),
        fear.wolfDistribution.instance.saleStart(),
        fear.wolfDistribution.instance.claimingStart(),

        fear.wolfDistribution.instance.getPresaleWolvesAvailable(),
        fear.wolfDistribution.instance.presalePrice(),
        fear.wolfDistribution.instance.presaleWolvesPerAccountLimit(),

        fear.wolfDistribution.instance.totalWolvesReserved(),
        fear.wolfDistribution.instance.totalWolvesBought(),

        fear.wolfDistribution.instance.getPublicSaleWolvesAvailable(),
        fear.wolfDistribution.instance.getCurrentPrice(),
        fear.wolfDistribution.instance.salePriceMin(),
        fear.wolfDistribution.instance.salePriceMax(),

        fear.wolfDistribution.instance.initialPresaleWolvesCount(),
        fear.wolfDistribution.instance.initialSaleWolvesCount(),
    ]);
    Object.assign(vm, {
        wsStartEpoch: wsStartEpochBN.toNumber(),
        asStartEpoch: asStartEpochBN.toNumber(),
        preSaleStartEpoch: preSaleStartEpochBN.toNumber(),
        publicSaleStartEpoch: publicSaleStartEpochBN.toNumber(),
        preSaleRemain: preSaleRemainBN.toNumber(),
        preSalePriceBN,
        preSaleLimit: preSaleLimitBN.toNumber(),
        preSaleClaimEpoch: claimingStartEpochBN.toNumber(),
        totalReserved: totalReservedBN.toNumber(),
        totalBought: totalBoughtBN.toNumber(),
        publicSaleRemain: publicSaleRemainBN.toNumber(),
        publicSalePriceBN,
        publicSalePriceMinBN,
        publicSalePriceMaxBN,
        initialPreSaleAmount: initialPreSaleAmountBN.toNumber(),
        initialPublicSaleAmount: initialPublicSaleAmountBN.toNumber(),
    });
    Object.assign(vm, {
        selectedTab: getEpoch() >= vm.publicSaleStartEpoch ? tabs[1] : tabs[0],
    })
    // // mock
    // const t = getEpoch();
    // Object.assign(vm, {
    //     epoch: t,
    //     wsStartEpoch: t+1,
    // });
}

const fetchUserStats = async () => {
    const [
        wolvesReservedBN,
        wolvesBoughtBN,
        wolvesClaimedBN,
        wsEligible,
        asEligible,
        etherBalanceBN,
    ] = await Promise.all([
        fear.wolfDistribution.instance.getMyNumberOfWolvesReserved(),
        fear.wolfDistribution.instance.getMyNumberOfWolvesBought(),
        fear.wolfDistribution.instance.getMyNumberOfWolvesClaimed(),
        fear.wolfDistribution.instance.getMyWhitelistedStatus(),
        fear.wolfDistribution.instance.getMyAffiliatedStatus(),
        blockchain.signer.getBalance(),
    ]);
    Object.assign(vm, {
        reserved: wolvesReservedBN.toNumber(),
        bought: wolvesBoughtBN.toNumber(),
        claimed: wolvesClaimedBN.toNumber(),
        wsEligible,
        asEligible,
        etherBalanceBN,
    });

    Object.assign(vm, {
        eligibleEpoch: (vm.wsEligible && vm.wsStartEpoch) || (vm.asEligible && vm.asStartEpoch) || vm.preSaleStartEpoch,
    });

    // mock
    // Object.assign(vm, {
    //     wsEligible: false,
    // });
}

const fetchInitialData = async (walletConnected = false) => {
    let vm = Alpine.store("vm");
    await fetchWolfSaleStats();
    if(walletConnected) await fetchUserStats();
    vm.ready = true;
    if(vm.noMetamask) {
        notify("Please install Metamask to join the sale", "error");
    }
}

const tabs = [
    "INO Sale",
    "Public Sale",
];

const alpineInit = async () => {
    // Alpine.store("blockchain", blockchain);
    // window.blockchain = Alpine.store("blockchain");
    Alpine.store("vm", {
        epoch: getEpoch(),
        ready: false,
        error: null,
        loading: {
            RESERVE_WOLF: false,
            CLAIM_WOLF: false,
            BUY_WOLF: false,
            CONNECT_WALLET: false,
        },
        notification: null,
        tabs,
        // selectedTab: tabs[0],
        noMetamask: typeof _.get(window, "ethereum.request") != 'function',
        // user's stats
        wallet: null,
        etherBalanceBN: null,
        wsEligible: null, // eligible for whitelist sale
        asEligible: null, // eligible for affiliate sale
        eligibleEpoch: null, // eligible time to start reserving
        reserved: null, // number of wolves bought on presale
        claimed: null, // number of wolves claimed on presale
        bought: null, // number of wolves bought on public sale
        // pre-sale stats
        initialPreSaleAmount: null,
        wsStartEpoch: null, // whitelist sale start time
        asStartEpoch: null, // affiliate sale start time
        preSaleStartEpoch: null, // pre-sale start time 
        preSaleClaimEpoch: null,
        preSaleRemain: null, // number of wolves remain before public sale
        preSalePriceBN: null,
        preSaleLimit: null, // buy limit per account on presales
        totalReserved: null, // total wolves sold on presales
        // public-sale
        initialPublicSaleAmount: null,
        publicSaleStartEpoch: null, // public-sale start time
        totalBought: null, // total wolves sold on public sale 
        publicSaleRemain: null, // number of wolves remain on public sale
        publicSalePriceBN: null,
        publicSalePriceMinBN: null,
        publicSalePriceMaxBN: null,
        // buy
        buyAmount: 1,
    });
    setInterval(() => {
        // vm.epoch += 1;
        vm.epoch = getEpoch();
    }, 1000);
    const vm = window.vm = Alpine.store("vm");
    try {
        blockchain.startEventListener();
        const walletConnected = !vm.noMetamask && (await getWeb3ActiveChainId()) == DEFAULT_CHAINID && ethers.utils.isAddress(await getWeb3ActiveAddress());
        if(walletConnected) await blockchain.connectMetamask();
        await fetchInitialData(walletConnected);
    }
    catch(e) {
        vm.error = e;
        console.error(e);
    }
}
