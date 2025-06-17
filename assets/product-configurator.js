class ProductConfigurator extends HTMLElement {
  constructor() {
    super();
    
    this.productData = JSON.parse(document.querySelector('[data-product-json]').textContent);
    this.currentVariant = this.productData.selected_or_first_available_variant;
    this.selectedOptions = [...this.currentVariant.options];
    
    this.init();
  }

  init() {
    this.setupColorSelection();
    this.setupSizeSelection();
    this.updateTotalPrice();
  }

  setupColorSelection() {
    const colorOptions = this.querySelectorAll('.product-configurator__color-option');
    
    colorOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        colorOptions.forEach(opt => {
          opt.classList.remove('selected');
          const check = opt.querySelector('.color-option__check');
          if (check) check.style.opacity = '0';
        });
        
        option.classList.add('selected');
        const check = option.querySelector('.color-option__check');
        if (check) check.style.opacity = '1';
        
        const optionValue = option.dataset.optionValue;
        const optionPosition = parseInt(option.dataset.optionPosition);
        const colorName = option.dataset.color;
        
        this.updateVariant(optionPosition, optionValue);
        this.updateProductImageByColor(colorName);
        this.updateSelectedColorDisplay(optionValue);
        this.updateTotalPrice();
      });
    });
  }

  setupSizeSelection() {
    const sizeOptions = this.querySelectorAll('.product-configurator__size-option');
    
    sizeOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        sizeOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        const optionValue = option.dataset.optionValue;
        const optionPosition = parseInt(option.dataset.optionPosition);
        
        this.updateVariant(optionPosition, optionValue);
        this.updateTotalPrice();
      });
    });
  }

  updateVariant(optionPosition, optionValue) {
    this.selectedOptions[optionPosition - 1] = optionValue;
    
    const matchingVariant = this.productData.variants.find(variant => {
      return variant.options.every((option, index) => option === this.selectedOptions[index]);
    });
    
    if (matchingVariant && matchingVariant.available) {
      this.currentVariant = matchingVariant;
      
      const variantInput = this.querySelector('.product-variant-id');
      if (variantInput) {
        variantInput.value = matchingVariant.id;
      }
    }
  }

  updateProductImageByColor(colorName) {
    const images = this.querySelectorAll('.product-configurator__image');
    
    images.forEach(img => img.classList.remove('active'));
    
    // First try to find image with matching color in data-color attribute
    let matchingImage = this.querySelector(`[data-color="${colorName}"]`);
    
    // If not found, try to find by variant ID
    if (!matchingImage) {
      matchingImage = this.querySelector(`[data-variant-id="${this.currentVariant.id}"]`);
    }
    
    // If still not found, try to find by checking if alt text contains the color name
    if (!matchingImage) {
      images.forEach(img => {
        const altText = img.querySelector('img')?.alt?.toLowerCase() || '';
        if (altText.includes(colorName.toLowerCase())) {
          matchingImage = img;
        }
      });
    }
    
    // Fallback to first image
    if (!matchingImage) {
      matchingImage = images[0];
    }
    
    if (matchingImage) {
      matchingImage.classList.add('active');
    }
  }

  updateSelectedColorDisplay(colorValue) {
    const selectedColorSpan = this.querySelector('[data-selected-color], [data-selected-farbe]');
    if (selectedColorSpan) {
      selectedColorSpan.textContent = colorValue;
    }
  }

  updateTotalPrice() {
    const totalPrice = this.currentVariant.price;
    
    const totalPriceElement = this.querySelector('[data-total-price]');
    if (totalPriceElement) {
      totalPriceElement.textContent = this.formatMoney(totalPrice);
    }
  }

  formatMoney(cents) {
    const euros = cents / 100;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(euros);
  }
}

customElements.define('product-configurator-info', ProductConfigurator);

document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('.product-configurator__form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(form);
      
      fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 422) {
          console.error('Error adding to cart:', data.description);
          alert('Error adding to cart: ' + data.description);
        } else {
          // Redirect to cart or show success message
          window.location.href = '/cart';
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while adding to cart');
      });
    });
  }
}); 