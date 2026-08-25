// Prize Pool Animation Controller
class PrizePoolController {
    constructor() {
        this.isAnimating = false;
        this.currentPhase = 0;
        this.phases = [
            'header',
            'main-prizes',
            'other-rewards',
            'total'
        ];
        
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.startAnimation();
            this.addInteractiveEffects();
        });
    }

    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        console.log('Starting Prize Pool Animation...');
        
        // Reset all elements to initial state
        this.resetAllElements();
        
        // Start the animation sequence
        setTimeout(() => {
            this.showContainer();
        }, 500);
    }

    resetAllElements() {
        const container = document.querySelector('.main-container');
        const header = document.querySelector('.header-section');
        const prizes = document.querySelectorAll('.prize-item');
        const rewards = document.querySelector('.other-rewards');
        const rewardItems = document.querySelectorAll('.reward-item');
        const total = document.querySelector('.total-section');

        // Reset container
        container.style.opacity = '0';
        container.style.transform = 'translateY(50px)';

        // Reset header
        header.style.opacity = '0';
        header.style.transform = 'translateY(-50px)';

        // Reset prizes
        prizes.forEach(prize => {
            prize.style.opacity = '0';
            prize.style.transform = 'translateX(-100px)';
        });

        // Reset rewards
        rewards.style.opacity = '0';
        rewards.style.transform = 'translateX(100px)';

        rewardItems.forEach(item => {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.8)';
        });

        // Reset total
        total.style.opacity = '0';
        total.style.transform = 'translateY(50px)';
    }

    showContainer() {
        const container = document.querySelector('.main-container');
        container.style.transition = 'all 2s ease-out';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        
        setTimeout(() => this.showHeader(), 1500);
    }

    showHeader() {
        const header = document.querySelector('.header-section');
        const underline = document.querySelector('.title-underline');
        
        header.style.transition = 'all 1.5s ease-out';
        header.style.opacity = '1';
        header.style.transform = 'translateY(0)';
        
        // Animate underline
        setTimeout(() => {
            underline.style.transition = 'transform 2s ease-out';
            underline.style.transform = 'scaleX(1)';
        }, 500);
        
        setTimeout(() => this.showMainPrizes(), 2000);
    }

    showMainPrizes() {
        const prizes = document.querySelectorAll('.prize-item');
        const delays = [0, 200, 400, 600, 800, 1000, 1200];
        
        prizes.forEach((prize, index) => {
            setTimeout(() => {
                prize.style.transition = 'all 1s ease-out';
                prize.style.opacity = '1';
                prize.style.transform = 'translateX(0)';
                
                // Add special effect for champion
                if (prize.classList.contains('champion')) {
                    setTimeout(() => {
                        this.addChampionEffect(prize);
                    }, 500);
                }
            }, delays[index]);
        });
        
        setTimeout(() => this.showOtherRewards(), 2000);
    }

    showOtherRewards() {
        const rewardsSection = document.querySelector('.other-rewards');
        const rewardItems = document.querySelectorAll('.reward-item');
        
        // Show rewards section
        rewardsSection.style.transition = 'all 1s ease-out';
        rewardsSection.style.opacity = '1';
        rewardsSection.style.transform = 'translateX(0)';
        
        // Show individual reward items
        const delays = [500, 700, 900];
        rewardItems.forEach((item, index) => {
            setTimeout(() => {
                item.style.transition = 'all 0.8s ease-out';
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
            }, delays[index]);
        });
        
        setTimeout(() => this.showTotal(), 1500);
    }

    showTotal() {
        const total = document.querySelector('.total-section');
        total.style.transition = 'all 1s ease-out';
        total.style.opacity = '1';
        total.style.transform = 'translateY(0)';
        
        // Add pulsing effect to total amount
        setTimeout(() => {
            this.addTotalEffect();
        }, 500);
        
        this.isAnimating = false;
        console.log('Prize Pool Animation Complete!');
    }

    addChampionEffect(championElement) {
        championElement.style.animation = 'championPulse 2s ease infinite alternate';
        
        // Add CSS for champion pulse if not exists
        if (!document.querySelector('#champion-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'champion-pulse-style';
            style.textContent = `
                @keyframes championPulse {
                    0% {
                        box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
                        transform: scale(1);
                    }
                    100% {
                        box-shadow: 0 0 50px rgba(255, 215, 0, 0.6);
                        transform: scale(1.02);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    addTotalEffect() {
        const totalAmount = document.querySelector('.total-amount');
        totalAmount.style.animation = 'totalGlow 2s ease infinite alternate';
    }

    addInteractiveEffects() {
        // Add hover sound effects (optional)
        const allItems = document.querySelectorAll('.prize-item, .reward-item');
        
        allItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.transform = item.classList.contains('reward-item') 
                    ? 'scale(1.05)' 
                    : 'translateY(-5px) scale(1.02)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.transform = item.classList.contains('reward-item') 
                    ? 'scale(1)' 
                    : 'translateY(0) scale(1)';
            });
        });

        // Add click to restart animation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                this.restartAnimation();
            }
        });
    }

    restartAnimation() {
        if (this.isAnimating) return;
        
        console.log('Restarting Prize Pool Animation...');
        this.startAnimation();
    }

    // Auto-loop animation every 30 seconds (optional)
    startAutoLoop() {
        setInterval(() => {
            if (!this.isAnimating) {
                this.startAnimation();
            }
        }, 30000);
    }
}

// Global functions for external control
window.prizePoolController = new PrizePoolController();

// Optional: Start auto-loop (uncomment if needed)
// window.prizePoolController.startAutoLoop();

// Utility functions
function restartPrizePoolAnimation() {
    window.prizePoolController.restartAnimation();
}

function toggleAutoLoop() {
    if (window.prizePoolController.autoLoop) {
        clearInterval(window.prizePoolController.autoLoop);
        window.prizePoolController.autoLoop = null;
        console.log('Auto-loop disabled');
    } else {
        window.prizePoolController.startAutoLoop();
        console.log('Auto-loop enabled');
    }
}

// Console commands for easy control
console.log('Prize Pool Controller loaded!');
console.log('Commands:');
console.log('- Press "R" to restart animation');
console.log('- restartPrizePoolAnimation() - Restart animation');
console.log('- toggleAutoLoop() - Toggle 30s auto-loop');
