class ProductConfigurator extends HTMLElement {
  constructor() {
    super();
    
    this.productData = JSON.parse(document.querySelector('[data-product-json]').textContent);
    this.currentVariant = this.productData.selected_or_first_available_variant;
    this.selectedAddons = [];
    this.basePrice = this.currentVariant.price;
    
    this.init();
  }

  init() {
    this.setupVariantSelection();
    this.setupColorSelection();
    this.setupAddonSelection();
    this.updateTotalPrice();
  }

  setupVariantSelection() {
    const versionOptions = this.querySelectorAll('.product-configurator__version-option');
    
    versionOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        versionOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        const optionValue = option.dataset.optionValue;
        const optionPosition = parseInt(option.dataset.optionPosition);
        
        this.updateVariant(optionPosition, optionValue);
        this.updateProductImage();
        this.updateTotalPrice();
      });
    });
  }

  setupColorSelection() {
    const colorOptions = this.querySelectorAll('.product-configurator__color-option');
    
    colorOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        colorOptions.forEach(opt => {
          opt.classList.remove('selected');
          opt.querySelector('.color-option__check').style.opacity = '0';
        });
        
        option.classList.add('selected');
        option.querySelector('.color-option__check').style.opacity = '1';
        
        const optionValue = option.dataset.optionValue;
        const optionPosition = parseInt(option.dataset.optionPosition);
        
        this.updateVariant(optionPosition, optionValue);
        this.updateProductImage();
        this.updateSelectedColorDisplay(optionValue);
      });
    });
  }

  setupAddonSelection() {
    const addonOptions = this.querySelectorAll('.addon-option');
    
    addonOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        const section = option.closest('.addon-section');
        const sectionOptions = section.querySelectorAll('.addon-option');
        
        sectionOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        const addonPrice = parseInt(option.dataset.addonPrice) || 0;
        const sectionIndex = Array.from(this.querySelectorAll('.addon-section')).indexOf(section);
        
        this.selectedAddons[sectionIndex] = addonPrice;
        this.updateTotalPrice();
      });
    });
  }

  updateVariant(optionPosition, optionValue) {
    const selectedOptions = [...this.currentVariant.options];
    selectedOptions[optionPosition - 1] = optionValue;
    
    const matchingVariant = this.productData.variants.find(variant => {
      return variant.options.every((option, index) => option === selectedOptions[index]);
    });
    
    if (matchingVariant && matchingVariant.available) {
      this.currentVariant = matchingVariant;
      this.basePrice = matchingVariant.price;
      
      const variantInput = this.querySelector('.product-variant-id');
      if (variantInput) {
        variantInput.value = matchingVariant.id;
      }
    }
  }

  updateProductImage() {
    const images = this.querySelectorAll('.product-configurator__image');
    
    images.forEach(img => img.classList.remove('active'));
    
    const matchingImage = this.querySelector(`[data-variant-id="${this.currentVariant.id}"]`);
    if (matchingImage) {
      matchingImage.classList.add('active');
    } else {
      images[0]?.classList.add('active');
    }
  }

  updateSelectedColorDisplay(colorValue) {
    const selectedColorSpan = this.querySelector('[data-selected-color], [data-selected-farbe]');
    if (selectedColorSpan) {
      selectedColorSpan.textContent = colorValue;
    }
  }

  updateTotalPrice() {
    const addonTotal = this.selectedAddons.reduce((sum, price) => sum + (price || 0), 0);
    const totalPrice = this.basePrice + (addonTotal * 100);
    
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
        } else {
          window.location.href = '/cart';
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
    });
  }
}); 