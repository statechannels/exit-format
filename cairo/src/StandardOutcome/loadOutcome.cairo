%builtins output

from AssetOutcome import AllocationEntry
from AssetOutcome import AssetOutcome

from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.serialize import serialize_word
from starkware.cairo.common.registers import get_fp_and_pc

func get_outcome_data() -> (assets: AssetOutcome*, asset_count: felt):
    alloc_locals
    local n
    let (local assets: AssetOutcome*) = alloc()
    %{
    # python hint reads json data as program_input
    print('assets pointer address: ' + str(ids.assets.address_))
    ids.n = len(program_input)

    for i, aOutcome in enumerate(program_input):
        # determining cairo memory address to write to
        asset_outcome_base_address = ids.assets.address_ + i * ids.AssetOutcome.SIZE
        # write to cairo's memory[] array at correct struct member offsets
        memory[asset_outcome_base_address + ids.AssetOutcome.asset] = aOutcome['asset']
        memory[asset_outcome_base_address + ids.AssetOutcome.data] = aOutcome['data']
        
        allocation_ptr = asset_outcome_base_address + ids.AssetOutcome.allocation
        # allocating memory segments for the list of AllocationEntries
        memory[allocation_ptr] = segments.add()
        print('asset_outcome['+str(i)+']_base_address: ' + str(asset_outcome_base_address))
        print('asset_outcome['+str(i)+']_allocation_ptr_address: ' + str(allocation_ptr))
        print('asset_outcome['+str(i)+']_allocation_ptr_contents: ' + str(memory[allocation_ptr]))

        for j, allocationEntry in enumerate(aOutcome['allocation']):
            allocation_j_addr = memory[allocation_ptr] + j * ids.AllocationEntry.SIZE
            print('\tallocation['+str(j)+']_address: ' + str(allocation_j_addr))
            memory[allocation_j_addr + ids.AllocationEntry.destination] = allocationEntry['destination']
            memory[allocation_j_addr + ids.AllocationEntry.amount] = allocationEntry['amount']
            memory[allocation_j_addr + ids.AllocationEntry.data] = allocationEntry['data']
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

    # local z_ptr = AssetOutcome.SIZE
    # local z: AssetOutcome* = [&x + AssetOutcome.SIZE]
    # # local z: AssetOutcome* = cast(&x + AssetOutcome.SIZE, AssetOutcome*)
    # serialize_word(z.asset)
    # serialize_word(z.allocation.destination)
    return ()
end