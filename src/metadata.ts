import { defaultAbiCoder, ParamType } from "@ethersproject/abi";
import { BytesLike } from "@ethersproject/bytes";

export enum ExitMetadataType {
  ERC20,
  ERC1155,
}

export function makeERC1155ExitMetadata(tokenId: number): BytesLike {
  return defaultAbiCoder.encode(
    ["uint8", "tuple(uint256)"],
    [ExitMetadataType.ERC1155, [tokenId]]
  );
}
