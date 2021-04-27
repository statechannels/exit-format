# Q - does a felt work as a destination?

struct AllocationEntry:
    member destination: felt
    member amount: felt
    member data: felt 
end

struct AssetOutcome:
    member asset: felt # 0 for eth, otherwise a token contract address
    member allocation: AllocationEntry*
    member data: felt
end
