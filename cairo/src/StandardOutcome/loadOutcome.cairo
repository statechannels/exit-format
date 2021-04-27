%builtins output

from AssetOutcome import AllocationEntry
from AssetOutcome import AssetOutcome

from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.serialize import serialize_word
from starkware.cairo.common.registers import get_fp_and_pc


func get_outcome_data() -> (assets: AssetOutcome*, asset_count: felt):
    alloc_locals
    local n
    let (assets: AssetOutcome*) = alloc()
    %{
    # python hint reads json data into memory
    ids.n = len(program_input)
    for i, aOutcome in enumerate(program_input):
        # determining cairo memory address to write to
        asset_outcome_base_address = ids.assets.address_ + i * ids.AssetOutcome.SIZE
        # memory[] here is python's representation of cairo's run-time memory array
        memory[asset_outcome_base_address + ids.AssetOutcome.asset] = aOutcome['asset']
    %}
    return (assets=assets, asset_count=n)
end

func main{output_ptr: felt*}():
    alloc_locals
    let (local __fp__, _) = get_fp_and_pc()

    let (local x,y) = get_outcome_data()
    serialize_word(x.asset)
    serialize_word(y)
    local z: AssetOutcome* = cast(&x + 1, AssetOutcome*)
    serialize_word(z.asset)
    return ()
end