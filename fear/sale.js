const fetchWolfSaleStats = async (setSelectedTab = false) => {
    const [
        wsStartEpochBN,
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
    const epoch = getEpoch();
    if(epoch < vm.publicSaleStartEpoch) {
        vm.preSaleRemain -= 100;
        if(vm.preSaleRemain < 0) vm.preSaleRemain = 0;
    }
    else {
        vm.publicSaleRemain -= 100;
        if(vm.publicSaleRemain < 0) vm.publicSaleRemain = 0;
    }
    if(setSelectedTab) Object.assign(vm, {
        selectedTab: epoch >= vm.publicSaleStartEpoch ? tabs[1] : tabs[0],
    })
}

const fetchUserStats = async (updateBuyAmount = true) => {
    const vm = Alpine.store("vm");
    const [
        wolvesReservedBN,
        wolvesBoughtBN,
        wolvesClaimedBN,
        wsEligible,
        etherBalanceBN,
    ] = await Promise.all([
        fear.wolfDistribution.instance.getMyNumberOfWolvesReserved(),
        fear.wolfDistribution.instance.getMyNumberOfWolvesBought(),
        fear.wolfDistribution.instance.getMyNumberOfWolvesClaimed(),
        fear.wolfDistribution.instance.getMyWhitelistedStatus(),
        blockchain.signer.getBalance(),
    ]);
    Object.assign(vm, {
        reserved: wolvesReservedBN.toNumber(),
        bought: wolvesBoughtBN.toNumber(),
        claimed: wolvesClaimedBN.toNumber(),
        wsEligible,
        etherBalanceBN,
    });
    Object.assign(vm, {
        eligibleEpoch: (vm.wsEligible && vm.wsStartEpoch) || vm.preSaleStartEpoch,
    });
    if(updateBuyAmount) Object.assign(vm, {
        publicSaleBuyAmount: Math.min(10, vm.publicSaleRemain),
        preSaleBuyAmount: Math.min(5, vm.preSaleRemain, vm.preSaleLimit - vm.reserved),
    })
}

const fetchInitialData = async () => {
    let vm = Alpine.store("vm");
    await fetchWolfSaleStats(true);
    vm.ready = true;
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
        // user's stats
        wallet: null,
        isMetaMask: false,
        isWalletConnect: false,
        etherBalanceBN: null,
        wsEligible: null, // eligible for whitelist sale
        eligibleEpoch: null, // eligible time to start reserving
        reserved: null, // number of wolves bought on presale
        claimed: null, // number of wolves claimed on presale
        bought: null, // number of wolves bought on public sale
        // pre-sale stats
        initialPreSaleAmount: null,
        wsStartEpoch: null, // whitelist sale start time
        preSaleStartEpoch: null, // pre-sale start time 
        preSaleClaimEpoch: null,
        preSaleRemain: null, // number of wolves remain before public sale
        preSalePriceBN: null,
        preSaleLimit: null, // buy limit per account on presales
        totalReserved: null, // total wolves sold on presales
        preSaleBuyAmount: 5,
        // public-sale
        initialPublicSaleAmount: null,
        publicSaleStartEpoch: null, // public-sale start time
        totalBought: null, // total wolves sold on public sale 
        publicSaleRemain: null, // number of wolves remain on public sale
        publicSalePriceBN: null,
        publicSalePriceMinBN: null,
        publicSalePriceMaxBN: null,
        publicSaleBuyAmount: 10,
    });
    setInterval(() => {
        // vm.epoch += 1;
        vm.epoch = getEpoch();
    }, 1000);
    const vm = window.vm = Alpine.store("vm");
    try {
        await closeExistingWCSession();
        blockchain.startEventListener();
        await fetchInitialData();
    }
    catch(e) {
        vm.error = e;
        console.error(e);
    }
}
