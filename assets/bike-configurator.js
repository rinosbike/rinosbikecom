class BikeConfigurator extends HTMLElement {
  constructor() {
    super();
    
    this.productHandle = this.dataset.productHandle;
    this.productId = this.dataset.productId;
    this.sectionId = this.dataset.section;
    
    // Get variant data from the existing script tag
    this.variantData = this.getVariantData();
    this.currentVariant = this.variantData[0]; // Default to first variant
    
    this.init();
  }

  init() {
    this.setupVariantRadios();
    this.setupImageSwitching();
    this.setupPriceUpdates();
    this.updateInitialState();
  }

  getVariantData() {
    const variantScript = this.querySelector('script[type="application/json"]');
    if (variantScript) {
      try {
        return JSON.parse(variantScript.textContent);
      } catch (e) {
        console.error('Error parsing variant data:', e);
        return [];
      }
    }
    return [];
  }

  setupVariantRadios() {
    const variantRadios = this.querySelector('variant-radios');
    if (!variantRadios) return;

    // Listen for changes on all radio inputs
    const radioInputs = this.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(input => {
      input.addEventListener('change', this.handleVariantChange.bind(this));
    });
  }

  handleVariantChange() {
    this.updateCurrentVariant();
    this.updateProductImage();
    this.updatePrice();
    this.updateSelectedColorDisplay();
    this.updateVariantInput();
    this.updateAddToCartButton();
  }

  updateCurrentVariant() {
    // Get all selected options
    const selectedOptions = [];
    const fieldsets = this.querySelectorAll('fieldset');
    
    fieldsets.forEach((fieldset, index) => {
      const checkedInput = fieldset.querySelector('input[type="radio"]:checked');
      if (checkedInput) {
        selectedOptions[index] = checkedInput.value;
      }
    });

    // Find matching variant
    this.currentVariant = this.variantData.find(variant => {
      return variant.options.every((option, index) => option === selectedOptions[index]);
    });

    if (!this.currentVariant) {
      this.currentVariant = this.variantData[0];
    }
  }

  updateProductImage() {
    const images = document.querySelectorAll('.configurator-image');
    if (!images.length) return;

    // Hide all images
    images.forEach(img => img.classList.remove('active'));

    // Get selected color
    const colorInput = this.querySelector('input[data-color]:checked');
    const selectedColor = colorInput ? colorInput.dataset.color : null;

    let targetImage = null;

    // Try to find image by variant ID first
    if (this.currentVariant) {
      targetImage = document.querySelector(`[data-variant-id="${this.currentVariant.id}"]`);
    }

    // If not found, try by color
    if (!targetImage && selectedColor) {
      targetImage = document.querySelector(`[data-color*="${selectedColor}"]`);
    }

    // If still not found, try by color name in alt text
    if (!targetImage && selectedColor) {
      images.forEach(img => {
        const imgElement = img.querySelector('img');
        const altText = imgElement ? imgElement.alt.toLowerCase() : '';
        if (altText.includes(selectedColor.toLowerCase())) {
          targetImage = img;
        }
      });
    }

    // Fallback to first image
    if (!targetImage) {
      targetImage = images[0];
    }

    // Show the target image
    if (targetImage) {
      targetImage.classList.add('active');
    }
  }

  updatePrice() {
    if (!this.currentVariant) return;

    const priceDisplay = this.querySelector('[data-price-display]');
    if (priceDisplay) {
      // Format price using Shopify's money format
      const formattedPrice = this.formatMoney(this.currentVariant.price);
      priceDisplay.textContent = formattedPrice;
    }
  }

  updateSelectedColorDisplay() {
    const colorInput = this.querySelector('input[data-color]:checked');
    const selectedColorDisplay = this.querySelector('[data-selected-color]');
    
    if (colorInput && selectedColorDisplay) {
      selectedColorDisplay.textContent = colorInput.value;
    }
  }

  updateVariantInput() {
    const variantInput = this.querySelector('.product-variant-id');
    if (variantInput && this.currentVariant) {
      variantInput.value = this.currentVariant.id;
    }
  }

  updateAddToCartButton() {
    const addButton = this.querySelector('.product-form__cart-submit');
    const buttonText = addButton ? addButton.querySelector('span') : null;
    
    if (!addButton || !buttonText) return;

    if (this.currentVariant && this.currentVariant.available) {
      addButton.disabled = false;
      buttonText.textContent = 'In den Einkaufswagen';
      addButton.classList.remove('disabled');
    } else {
      addButton.disabled = true;
      buttonText.textContent = 'Ausverkauft';
      addButton.classList.add('disabled');
    }
  }

  updateInitialState() {
    // Set initial variant based on first checked options
    this.updateCurrentVariant();
    this.updateProductImage();
    this.updatePrice();
    this.updateSelectedColorDisplay();
    this.updateVariantInput();
    this.updateAddToCartButton();
  }

  setupImageSwitching() {
    // Additional setup for image switching if needed
    const images = document.querySelectorAll('.configurator-image img');
    images.forEach(img => {
      img.addEventListener('load', () => {
        // Image loaded successfully
      });
      
      img.addEventListener('error', () => {
        console.warn('Failed to load image:', img.src);
      });
    });
  }

  setupPriceUpdates() {
    // Listen for variant changes from Shopify's native system
    document.addEventListener('variant:change', (event) => {
      if (event.detail && event.detail.variant) {
        this.currentVariant = event.detail.variant;
        this.updatePrice();
        this.updateAddToCartButton();
      }
    });
  }

  formatMoney(cents) {
    // Basic money formatting - you might want to use Shopify's money format
    const euros = cents / 100;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(euros);
  }
}

// Define the custom element
customElements.define('bike-configurator', BikeConfigurator);

// Enhanced VariantRadios class to work with our configurator
class ConfiguratorVariantRadios extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange.bind(this));
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.updateVariantInput();
    
    // Dispatch custom event for our configurator
    const event = new CustomEvent('variant:change', {
      detail: {
        variant: this.currentVariant,
        options: this.options
      },
      bubbles: true
    });
    
    this.dispatchEvent(event);
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('input[type="radio"]:checked'), (input) => input.value);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-configurator`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      if (input && this.currentVariant) {
        input.value = this.currentVariant.id;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  getVariantData() {
    const variantScript = this.querySelector('script[type="application/json"]');
    if (variantScript) {
      try {
        return JSON.parse(variantScript.textContent);
      } catch (e) {
        console.error('Error parsing variant data:', e);
        return [];
      }
    }
    return [];
  }
}

// Register the enhanced variant radios
if (!customElements.get('variant-radios')) {
  customElements.define('variant-radios', ConfiguratorVariantRadios);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Setup form submission
  const configuratorForm = document.querySelector('#product-form-configurator');
  if (configuratorForm) {
    configuratorForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const addButton = this.querySelector('.product-form__cart-submit');
      const spinner = this.querySelector('.loading__spinner');
      const buttonText = this.querySelector('.product-form__cart-submit span');
      
      // Show loading state
      if (addButton) addButton.disabled = true;
      if (spinner) spinner.classList.remove('hidden');
      if (buttonText) buttonText.style.opacity = '0.5';
      
      // Add to cart
      fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 422) {
          console.error('Error adding to cart:', data.description);
          alert('Error: ' + data.description);
        } else {
          // Success - redirect to cart or show success message
          window.location.href = '/cart';
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while adding to cart');
      })
      .finally(() => {
        // Reset button state
        if (addButton) addButton.disabled = false;
        if (spinner) spinner.classList.add('hidden');
        if (buttonText) buttonText.style.opacity = '1';
      });
    });
  }
}); 