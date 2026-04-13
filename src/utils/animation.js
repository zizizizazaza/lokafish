// Animation utilities

/**
 * Animate a number counting up
 */
export function animateCounter(element, target, duration = 2000, prefix = '', suffix = '') {
  const start = performance.now();
  const initial = 0;
  
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(initial + (target - initial) * eased);
    
    if (target >= 1000000) {
      element.textContent = `${prefix}${(current / 1000000).toFixed(1)}M${suffix}`;
    } else if (target >= 1000) {
      element.textContent = `${prefix}${(current / 1000).toFixed(target >= 10000 ? 0 : 1)}K${suffix}`;
    } else {
      element.textContent = `${prefix}${current.toLocaleString()}${suffix}`;
    }
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

/**
 * Stagger reveal children elements
 */
export function staggerReveal(container, selector, delayMs = 100) {
  const children = container.querySelectorAll(selector);
  children.forEach((child, i) => {
    setTimeout(() => {
      child.classList.add('visible');
    }, i * delayMs);
  });
}

/**
 * Trigger reveal when element is in viewport
 */
export function observeReveal(elements, threshold = 0.2) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold });

  elements.forEach(el => observer.observe(el));
}

/**
 * Smooth number formatting
 */
export function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K`;
  return num.toLocaleString();
}

/**
 * Delay helper
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
