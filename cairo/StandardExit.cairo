
struct Allocation:
    member destination: felt
    member amount: felt
    member data: felt 
end

struct SingleAssetExit:
    member asset: felt # 0 for eth, otherwise a token contract address
    member allocation: Allocation*
    member data: felt
end

struct Payout:
    member asset: felt
    member destination: felt
    member amount: felt
end

struct Exit:
    member initialOutcome: SingleAssetExit*
    member initialHoldings: felt*
    member exitRequest: felt**
end
