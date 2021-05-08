# %builtins output

from StandardExit import Allocation
from StandardExit import SingleAssetExit

from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.serialize import serialize_word
from starkware.cairo.common.registers import get_fp_and_pc

func get_outcome_data() -> (assets: SingleAssetExit*, asset_count: felt):
    alloc_locals
    local n
    let (local assets: SingleAssetExit*) = alloc()
    %{
    # python hint reads json data as program_input
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


    print('assets pointer address: ' + str(ids.assets.address_))
    program_input = numberify(program_input)
    
    if 'initialOutcome' in program_input:
        outcomeData = program_input['initialOutcome']
    else:
        outcomeData = program_input

    ids.n = len(outcomeData)

    for i, aOutcome in enumerate(outcomeData):
        # determining cairo memory address to write to
        asset_outcome_base_address = ids.assets.address_ + i * ids.SingleAssetExit.SIZE
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
    %}
    return (assets=assets, asset_count=n)
end

func main{output_ptr: felt*}():
    alloc_locals
    let (local __fp__, _) = get_fp_and_pc()

    let (local x,y) = get_outcome_data()
    serialize_word(x.asset)
    serialize_word(y)
    
    ## WIP manipulation / traversing of 

    # local z_ptr = SingleAssetExit.SIZE
    # local z: SingleAssetExit* = [&x + SingleAssetExit.SIZE]
    # # local z: SingleAssetExit* = cast(&x + SingleAssetExit.SIZE, SingleAssetExit*)
    # serialize_word(z.asset)
    # serialize_word(z.allocation.destination)
    return ()
end