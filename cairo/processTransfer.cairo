%builtins output range_check

from StandardExit import Allocation
from StandardExit import SingleAssetExit
from StandardExit import Exit
from StandardExit import Payout

# from loadOutcome import get_outcome_data

from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.serialize import serialize_word
from starkware.cairo.common.registers import get_fp_and_pc
from starkware.cairo.common.math import assert_nn_le

func assert_valid_holdings_transform{range_check_ptr}(init: felt*, final: felt*, size):
    if size == 0:
        return ()
    end

    assert_nn_le([final], [init])
    assert_valid_holdings_transform(init=init + 1, final=final + 1, size=size-1)
    return ()
end

func process_transfer{range_check_ptr}() -> (
    initialOutcome: SingleAssetExit*,
    finalOutcome: SingleAssetExit*,
    payouts: Payout*,
    assetCount: felt,
    initialHoldings: felt*,
    finalHoldings: felt*):
    alloc_locals
    local assetCount
    let (local __fp__, _) = get_fp_and_pc()
    let (local initialOutcome: SingleAssetExit*) = alloc()
    let (local finalOutcome: SingleAssetExit*) = alloc()
    let (local payouts: Payout*) = alloc()
    let (local initialHoldings: felt*) = alloc()
    let (local finalHoldings: felt*) = alloc()

    %{
    def toBytesArray(inp, size):
        if inp[0] == '0' and inp[1] == 'x':
            num = int(inp, 16)
            return num
            arr = []

        while num > 0:
            r = num % (2**size)
            num = num // (2**size)
            arr.append(r)
        
        return arr

    def numberify(data):
        if type (data) is list:
            for i, item in enumerate(data):
                if type (data[i]) is str:
                    data[i] = toBytesArray(data[i], 32)
                elif type (data[i]) is list or type(data[i]) is dict:
                    data[i] = numberify(data[i])
        elif type (data) is dict:
            for i, key in enumerate(data):
                if type (data[key]) is str:
                    data[key] = toBytesArray(data[key], 32)
                elif type (data[key]) is list or type(data[key]) is dict:
                    data[key] = numberify(data[key])
        return data

    def writeOutcomeData(outcomeData, address):
        print(str(outcomeData))
        for i, aOutcome in enumerate(outcomeData):
            # determining cairo memory address to write to
            asset_outcome_base_address = address + i * ids.SingleAssetExit.SIZE
            # write to cairo's memory[] array at correct struct member offsets
            memory[asset_outcome_base_address + ids.SingleAssetExit.asset] = aOutcome['asset']
            memory[asset_outcome_base_address + ids.SingleAssetExit.data] = aOutcome['data']
            
            allocation_ptr = asset_outcome_base_address + ids.SingleAssetExit.allocation
            # allocating memory segments for the list of AllocationEntries
            memory[allocation_ptr] = segments.add()
            print('asset_outcome['+str(i)+']_base_address: ' + str(asset_outcome_base_address))
            print('asset_outcome['+str(i)+']_allocation_ptr_address: ' + str(allocation_ptr))
            print('asset_outcome['+str(i)+']_allocation_ptr_contents: ' + str(memory[allocation_ptr]))

            for j, allocationEntry in enumerate(aOutcome['allocations']):
                allocation_j_addr = memory[allocation_ptr] + j * ids.Allocation.SIZE
                print('\tallocation['+str(j)+']_address: ' + str(allocation_j_addr))
                memory[allocation_j_addr + ids.Allocation.destination] = allocationEntry['destination']
                memory[allocation_j_addr + ids.Allocation.amount] = allocationEntry['amount']
                memory[allocation_j_addr + ids.Allocation.data] = allocationEntry['data']
    
    
    # print('assets pointer address: ' + str(ids.initialOutcome.address_))

    # numberfy input (from hex strings)
    program_input = numberify(program_input)
    
    # populate python namespace with input data
    outcomeData = program_input['initialOutcome']
    exitRequest = program_input['exitRequest']
    holdings = program_input['initialHoldings']
    payouts = []

    # inform proover of the number of assets in the exit
    ids.assetCount = len(outcomeData)
    
    # write the initialOutcome cairo struct
    writeOutcomeData(outcomeData, ids.initialOutcome.address_)

    # write the initial holdings
    init_holdings_ptr = ids.initialHoldings
    for i, holding in enumerate(holdings):
        memory[init_holdings_ptr + i] = holdings[i]
    
    ###
    # Calculate the funded payouts
    ###

    # i indexes assets
    for i in range(len(exitRequest)):
        # j indexes payout participants array,
        # p is the participant's order in the allocation
        for j, p in enumerate(exitRequest[i]):
            availableToP = holdings[i]
            for k in range(p):
                availableToP -= outcomeData[i]['allocations'][k]['amount']
            if availableToP > 0:
                payout = min(outcomeData[i]['allocations'][p]['amount'], availableToP)
                payouts.append({
                    'asset': outcomeData[i]['asset'],
                    'destination': outcomeData[i]['allocations'][p]['destination'],
                    'amount': payout
                })
                holdings[i] -= payout
                outcomeData[i]['allocations'][p]['amount'] -= payout
    
    # write the finalOutcome cairo struct
    writeOutcomeData(outcomeData, ids.finalOutcome.address_)

    # write the payouts struct
    payouts_ptr_address = ids.payouts.address_

    for i, payout in enumerate(payouts):
        print('Payout[' + str(i) + ']: ' + str(payout))
        relative_address = payouts_ptr_address + i * ids.Payout.SIZE
        memory[relative_address + ids.Payout.asset] = payout['asset']
        memory[relative_address + ids.Payout.destination] = payout['destination']
        memory[relative_address + ids.Payout.amount] = payout['asset']

    # write the final holdings
    holdings_ptr = ids.finalHoldings
    for i, holding in enumerate(holdings):
        memory[holdings_ptr + i] = holdings[i]
    %}

    return (initialOutcome,
            finalOutcome,
            payouts,
            assetCount,
            initialHoldings,
            finalHoldings)
end

func main{output_ptr: felt*, range_check_ptr}():
    alloc_locals
    let (local __fp__, _) = get_fp_and_pc()

    # load the transfer params and compute new outcome
    let (initialOutcome: SingleAssetExit*,
        finalOutcome: SingleAssetExit*,
        payouts: Payout*,
        assetCount: felt,
        initialHoldings: felt*,
        finalHoldings: felt*) = process_transfer()

    # validate the transfer
    assert_valid_holdings_transform(initialHoldings, finalHoldings, assetCount)
    return ()
end
