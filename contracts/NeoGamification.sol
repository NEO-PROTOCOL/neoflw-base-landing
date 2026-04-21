// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 *  █▄░█ █▀▀ █▀█   █▀ █▀▄▀█ ▄▀█ █▀█ ▀█▀
 *  █░▀█ ██▄ █▄█   ▄█ █░▀░█ █▀█ █▀▄ ░█░
 *
 *  NΞØ SMART FACTORY v0.5.3 — REWARD CONTRACT | GAMIFICATION
 *  Author: NODE NEØ
 *
 *  Licensed under MIT. Attribution to NΞØ Protocol is required for derivatives.
 *  Any fork or usage of this factory for financial protocols must reference:
 *  "Powered by NEØ SMART FACTORY"
 */

/**
 * @title NeoGamification
 * @notice Sistema de gamificação com XP, níveis, streaks e badges soulbound.
 * @dev Dois modos de operação:
 *   1. Operadores confiáveis (e.g. NeoSocialTrigger) chamam awardXP/awardBadge diretamente.
 *   2. Usuários reivindicam recompensas via EIP-712 assinado pelo attester off-chain.
 *
 *  Arquitetura:
 *   - Off-chain oracle/attester valida ação → assina XPClaim → usuário submete on-chain
 *   - Contrato verifica assinatura, consome nonce, distribui XP e tokens
 *   - Backend indexa eventos para analytics / notificações
 *
 *  Níveis (XP acumulado):
 *   SEED     →    0 XP
 *   SPROUT   →  100 XP
 *   BLOOM    →  500 XP
 *   HARVEST  → 2000 XP
 *   LEGEND   → 10000 XP
 *
 *  Bônus de Streak (dias consecutivos de ação):
 *   ≥ 7 dias  → XP × 1.5
 *   ≥ 30 dias → XP × 2.0
 */
contract NeoGamification is Ownable, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    // =========================================================
    // NÍVEIS
    // =========================================================

    enum Level { SEED, SPROUT, BLOOM, HARVEST, LEGEND }

    /// @dev Limiares de XP por nível (índice = uint8(Level))
    uint256[5] public levelThresholds = [0, 100, 500, 2000, 10000];

    // =========================================================
    // BADGES (soulbound — não transferíveis)
    // =========================================================

    struct Badge {
        string name;
        string metadataURI;
        uint256 xpBonus; // XP extra concedido ao receber o badge
        bool active;
    }

    uint256 public badgeCounter;
    mapping(uint256 => Badge) public badges;
    mapping(address => mapping(uint256 => bool)) public hasBadge;

    // =========================================================
    // PERFIL DO USUÁRIO
    // =========================================================

    struct UserProfile {
        uint256 xp;
        Level level;
        uint256 streak;        // dias consecutivos com ação
        uint256 lastActionDay; // block.timestamp / 86400
        uint256 totalRewardsClaimed;
    }

    mapping(address => UserProfile) public profiles;

    // =========================================================
    // OPERADORES CONFIÁVEIS (e.g. NeoSocialTrigger)
    // =========================================================

    mapping(address => bool) public operators;

    // =========================================================
    // TOKEN DE RECOMPENSA
    // =========================================================

    IERC20 public rewardToken;

    // =========================================================
    // EIP-712 — CLAIM DIRETO COM PROVA OFF-CHAIN
    // =========================================================

    address public attester;
    mapping(bytes32 => bool) public usedNonce;

    struct XPClaim {
        address user;
        uint256 xpAmount;
        uint256 tokenAmount;
        uint256 badgeId;   // ignorado se !awardBadge
        bool awardBadge;
        uint256 deadline;
        bytes32 nonce;
    }

    bytes32 public constant XPCLAIM_TYPEHASH =
        keccak256(
            "XPClaim(address user,uint256 xpAmount,uint256 tokenAmount,uint256 badgeId,bool awardBadge,uint256 deadline,bytes32 nonce)"
        );

    // =========================================================
    // EVENTOS (bus para backend e indexadores)
    // =========================================================

    event XPAwarded(
        address indexed user,
        uint256 amount,
        uint256 totalXP,
        Level level,
        string reason
    );

    event LevelUp(
        address indexed user,
        Level oldLevel,
        Level newLevel
    );

    event StreakUpdated(
        address indexed user,
        uint256 streak
    );

    event BadgeCreated(
        uint256 indexed badgeId,
        string name
    );

    event BadgeAwarded(
        address indexed user,
        uint256 indexed badgeId,
        string name
    );

    event RewardClaimed(
        address indexed user,
        uint256 tokenAmount
    );

    event OperatorSet(address indexed operator, bool enabled);
    event AttesterUpdated(address indexed oldAttester, address indexed newAttester);

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    constructor(address _rewardToken, address _attester)
        Ownable(msg.sender)
        EIP712("NeoGamification", "1.0.0")
    {
        require(_attester != address(0), "attester=0");
        if (_rewardToken != address(0)) {
            rewardToken = IERC20(_rewardToken);
        }
        attester = _attester;
    }

    // =========================================================
    // MODIFIER
    // =========================================================

    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "not operator");
        _;
    }

    // =========================================================
    // ADMIN
    // =========================================================

    /// @notice Habilita ou desabilita um operador confiável (e.g. NeoSocialTrigger)
    function setOperator(address _operator, bool _enabled) external onlyOwner {
        operators[_operator] = _enabled;
        emit OperatorSet(_operator, _enabled);
    }

    /// @notice Atualiza o attester responsável por assinar provas off-chain
    function setAttester(address _attester) external onlyOwner {
        require(_attester != address(0), "attester=0");
        emit AttesterUpdated(attester, _attester);
        attester = _attester;
    }

    /// @notice Define o token ERC-20 usado para distribuição de recompensas
    function setRewardToken(address _token) external onlyOwner {
        rewardToken = IERC20(_token);
    }

    /// @notice Cria um novo badge soulbound
    function createBadge(
        string calldata name,
        string calldata metadataURI,
        uint256 xpBonus
    ) external onlyOwner returns (uint256 badgeId) {
        badgeId = badgeCounter++;
        badges[badgeId] = Badge({
            name: name,
            metadataURI: metadataURI,
            xpBonus: xpBonus,
            active: true
        });
        emit BadgeCreated(badgeId, name);
    }

    /// @notice Desativa um badge (não concedível a novos usuários)
    function deactivateBadge(uint256 badgeId) external onlyOwner {
        badges[badgeId].active = false;
    }

    /// @notice Retira tokens acumulados no contrato
    function withdrawTokens(uint256 amount) external onlyOwner {
        rewardToken.safeTransfer(owner(), amount);
    }

    // =========================================================
    // CORE — chamado por operadores (NeoSocialTrigger, etc.)
    // =========================================================

    /**
     * @notice Concede XP e tokens a um usuário.
     * @dev Apenas operadores confiáveis (owner ou endereços autorizados).
     * @param user Endereço do usuário
     * @param xpAmount Quantidade de XP base (streak bonus aplicado internamente)
     * @param tokenAmount Quantidade de tokens ERC-20 (0 = sem token reward)
     * @param reason Descrição da ação (e.g. "social_follow")
     */
    function awardXP(
        address user,
        uint256 xpAmount,
        uint256 tokenAmount,
        string calldata reason
    ) external onlyOperator nonReentrant {
        _awardXP(user, xpAmount, reason);
        if (tokenAmount > 0 && address(rewardToken) != address(0)) {
            _transferReward(user, tokenAmount);
        }
    }

    /**
     * @notice Concede um badge a um usuário e aplica o bônus de XP do badge.
     * @dev Badges são soulbound — não transferíveis e não duplicáveis por usuário.
     */
    function awardBadge(address user, uint256 badgeId)
        external
        onlyOperator
    {
        _awardBadge(user, badgeId);
    }

    // =========================================================
    // CORE — claim direto com prova EIP-712
    // =========================================================

    /**
     * @notice Usuário reivindica XP/recompensa com prova assinada pelo attester.
     * @dev Valida assinatura EIP-712, consome nonce e distribui recompensas.
     *      Padrão: oracle off-chain valida ação → assina XPClaim → user submete.
     * @param claim Estrutura com parâmetros da recompensa
     * @param signature Assinatura EIP-712 do attester
     */
    function claimReward(XPClaim calldata claim, bytes calldata signature)
        external
        nonReentrant
    {
        require(msg.sender == claim.user, "sender!=user");
        require(block.timestamp <= claim.deadline, "expired");
        require(!usedNonce[claim.nonce], "nonce replay");

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    XPCLAIM_TYPEHASH,
                    claim.user,
                    claim.xpAmount,
                    claim.tokenAmount,
                    claim.badgeId,
                    claim.awardBadge,
                    claim.deadline,
                    claim.nonce
                )
            )
        );

        address signer = digest.recover(signature);
        require(signer == attester, "bad sig");

        usedNonce[claim.nonce] = true;

        if (claim.xpAmount > 0) {
            _awardXP(claim.user, claim.xpAmount, "oracle_claim");
        }
        if (claim.awardBadge) {
            _awardBadge(claim.user, claim.badgeId);
        }
        if (claim.tokenAmount > 0 && address(rewardToken) != address(0)) {
            _transferReward(claim.user, claim.tokenAmount);
            emit RewardClaimed(claim.user, claim.tokenAmount);
        }
    }

    // =========================================================
    // INTERNAL
    // =========================================================

    function _awardXP(address user, uint256 amount, string memory reason) internal {
        UserProfile storage p = profiles[user];

        // --- Streak: verifica continuidade diária ---
        uint256 today = block.timestamp / 1 days;

        if (p.lastActionDay == 0) {
            p.streak = 1;
        } else if (today == p.lastActionDay + 1) {
            p.streak += 1;
            emit StreakUpdated(user, p.streak);
        } else if (today > p.lastActionDay + 1) {
            // quebrou o streak
            p.streak = 1;
            emit StreakUpdated(user, p.streak);
        }
        // mesmo dia: streak não muda

        p.lastActionDay = today;

        // --- Bônus de streak ---
        uint256 finalXP = amount;
        if (p.streak >= 30) {
            finalXP = (amount * 200) / 100; // 2×
        } else if (p.streak >= 7) {
            finalXP = (amount * 150) / 100; // 1.5×
        }

        Level oldLevel = p.level;
        p.xp += finalXP;
        p.level = _computeLevel(p.xp);

        emit XPAwarded(user, finalXP, p.xp, p.level, reason);

        if (p.level != oldLevel) {
            emit LevelUp(user, oldLevel, p.level);
        }
    }

    function _awardBadge(address user, uint256 badgeId) internal {
        Badge storage badge = badges[badgeId];
        require(badge.active, "badge not active");
        require(!hasBadge[user][badgeId], "already has badge");

        hasBadge[user][badgeId] = true;
        emit BadgeAwarded(user, badgeId, badge.name);

        // Aplica bônus de XP do badge (sem streak adicional)
        if (badge.xpBonus > 0) {
            _awardXP(user, badge.xpBonus, "badge_bonus");
        }
    }

    function _transferReward(address user, uint256 amount) internal {
        rewardToken.safeTransfer(user, amount);
        profiles[user].totalRewardsClaimed += amount;
    }

    function _computeLevel(uint256 xp) internal view returns (Level) {
        if (xp >= levelThresholds[4]) return Level.LEGEND;
        if (xp >= levelThresholds[3]) return Level.HARVEST;
        if (xp >= levelThresholds[2]) return Level.BLOOM;
        if (xp >= levelThresholds[1]) return Level.SPROUT;
        return Level.SEED;
    }

    // =========================================================
    // VIEW
    // =========================================================

    function getProfile(address user) external view returns (UserProfile memory) {
        return profiles[user];
    }

    function getLevelName(Level level) external pure returns (string memory) {
        if (level == Level.SEED)    return "SEED";
        if (level == Level.SPROUT)  return "SPROUT";
        if (level == Level.BLOOM)   return "BLOOM";
        if (level == Level.HARVEST) return "HARVEST";
        return "LEGEND";
    }
}
