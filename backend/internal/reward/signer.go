package reward

import (
	"crypto/ecdsa"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

// Signer holds the backend's ECDSA private key for signing reward vouchers.
// The corresponding public key address must be set as `trustedSigner` in GameReward.sol.
type Signer struct {
	privateKey *ecdsa.PrivateKey
	address    common.Address
}

// NewSigner loads a signer from a hex private key string (no 0x prefix).
func NewSigner(hexPrivKey string) (*Signer, error) {
	privKey, err := crypto.HexToECDSA(hexPrivKey)
	if err != nil {
		return nil, fmt.Errorf("load signer key: %w", err)
	}
	addr := crypto.PubkeyToAddress(privKey.PublicKey)
	return &Signer{privateKey: privKey, address: addr}, nil
}

// Address returns the public address of the signer (set this in GameReward.sol as trustedSigner)
func (s *Signer) Address() common.Address {
	return s.address
}

// SignCoinVoucher creates an ECDSA signature for a CADE Coin reward voucher.
//
// Matches GameReward.sol:
//
//	keccak256(abi.encodePacked(player, amount, nonce, chainId))
func (s *Signer) SignCoinVoucher(player common.Address, amount *big.Int, nonce *big.Int, chainID *big.Int) ([]byte, error) {
	hash := coinVoucherHash(player, amount, nonce, chainID)
	return s.sign(hash)
}

// SignBadgeVoucher creates an ECDSA signature for a Meadow Badge voucher.
//
// Matches GameReward.sol:
//
//	keccak256(abi.encodePacked(player, tokenId, nonce, chainId, "badge"))
func (s *Signer) SignBadgeVoucher(player common.Address, tokenID *big.Int, nonce *big.Int, chainID *big.Int) ([]byte, error) {
	hash := badgeVoucherHash(player, tokenID, nonce, chainID)
	return s.sign(hash)
}

// ─────────────────────────────────────────────
// Internal
// ─────────────────────────────────────────────

// sign applies Ethereum's personal_sign prefix and signs with the private key.
// This matches ethers.js signMessage() and OpenZeppelin's MessageHashUtils.toEthSignedMessageHash().
func (s *Signer) sign(hash []byte) ([]byte, error) {
	// Prefix: "\x19Ethereum Signed Message:\n32"
	prefixed := crypto.Keccak256(
		[]byte("\x19Ethereum Signed Message:\n32"),
		hash,
	)

	sig, err := crypto.Sign(prefixed, s.privateKey)
	if err != nil {
		return nil, fmt.Errorf("sign: %w", err)
	}

	// Adjust v: go-ethereum uses 0/1, Ethereum expects 27/28
	sig[64] += 27
	return sig, nil
}

func coinVoucherHash(player common.Address, amount, nonce, chainID *big.Int) []byte {
	return crypto.Keccak256(
		player.Bytes(),
		padBigInt(amount),
		padBigInt(nonce),
		padBigInt(chainID),
	)
}

func badgeVoucherHash(player common.Address, tokenID, nonce, chainID *big.Int) []byte {
	return crypto.Keccak256(
		player.Bytes(),
		padBigInt(tokenID),
		padBigInt(nonce),
		padBigInt(chainID),
		[]byte("badge"),
	)
}

// padBigInt left-pads a big.Int to 32 bytes (ABI encoding style)
func padBigInt(n *big.Int) []byte {
	b := n.Bytes()
	padded := make([]byte, 32)
	copy(padded[32-len(b):], b)
	return padded
}
