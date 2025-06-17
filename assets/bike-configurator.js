class BikeConfigurator extends HTMLElement {
  constructor() {
    super();
    this.variants = JSON.parse(this.querySelector('[type="application/json"]').textContent);
    this.currentVariant = this.variants.find(variant => variant.available) || this.variants[0];
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateDisplay();
  }

  setupEventListeners() {
    // Listen for variant changes
    this.addEventListener('change', this.onVariantChange.bind(this));
    
    // Listen for form submission
    const form = this.querySelector('form');
    if (form) {
      form.addEventListener('submit', this.onSubmitHandler.bind(this));
    }
  }

  onVariantChange(event) {
    this.updateOptions();
    this.updateVariant();
    this.updateDisplay();
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    const values = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked)?.value;
    });

    this.currentVariant = this.variants.find((variant) => {
      return !variant.options.map((option, index) => {
        return values[index] === option;
      }).includes(false);
    });

    if (!this.currentVariant) {
      this.currentVariant = this.variants[0];
    }
  }

  updateVariant() {
    // Update hidden variant ID input
    const variantIdInput = this.querySelector('.product-variant-id');
    if (variantIdInput) {
      variantIdInput.value = this.currentVariant.id;
    }

    // Update URL without page reload
    if (this.currentVariant) {
      const url = new URL(window.location);
      url.searchParams.set('variant', this.currentVariant.id);
      window.history.replaceState({}, '', url);
    }
  }

  updateDisplay() {
    this.updatePrice();
    this.updateProductAvailability();
    this.updateMedia();
    this.updateSelectedColorText();
  }

  updatePrice() {
    const priceDisplay = this.querySelector('[data-price-display]');
    if (priceDisplay && this.currentVariant) {
      const price = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(this.currentVariant.price / 100);
      
      priceDisplay.textContent = price;
    }
  }

  updateProductAvailability() {
    const addButton = this.querySelector('[name="add"]');
    const addButtonText = addButton?.querySelector('span');

    if (!addButton) return;

    if (this.currentVariant) {
      if (this.currentVariant.available) {
        addButton.disabled = false;
        if (addButtonText) {
          addButtonText.textContent = 'In den Einkaufswagen';
        }
      } else {
        addButton.disabled = true;
        if (addButtonText) {
          addButtonText.textContent = 'Ausverkauft';
        }
      }
    }
  }

  updateMedia() {
    if (!this.currentVariant) return;

    const mediaContainer = document.querySelector('.media-container');
    if (!mediaContainer) return;

    const allImages = mediaContainer.querySelectorAll('.configurator-image');
    
    // Hide all images first
    allImages.forEach(img => {
      img.classList.remove('active');
    });

    let activeImage = null;

    // Method 1: Try to find image by variant ID (most reliable)
    if (this.currentVariant.featured_media) {
      activeImage = mediaContainer.querySelector(`[data-media-id="${this.currentVariant.featured_media.id}"]`);
    }

    // Method 2: Try to find image by variant ID match
    if (!activeImage) {
      activeImage = mediaContainer.querySelector(`[data-variant-id="${this.currentVariant.id}"]`);
    }

    // Method 3: Fallback to first non-fallback image
    if (!activeImage) {
      activeImage = mediaContainer.querySelector('.configurator-image:not([data-fallback])');
    }

    // Method 4: Ultimate fallback to first image
    if (!activeImage) {
      activeImage = mediaContainer.querySelector('.configurator-image');
    }

    // Show the selected image
    if (activeImage) {
      activeImage.classList.add('active');
    }
  }

  updateSelectedColorText() {
    const colorDisplay = this.querySelector('[data-selected-color]');
    const colorInput = this.querySelector('input[data-color]:checked');
    
    if (colorDisplay && colorInput) {
      colorDisplay.textContent = colorInput.value;
    }
  }

  onSubmitHandler(evt) {
    evt.preventDefault();
    
    const form = evt.target;
    const formData = new FormData(form);
    const addButton = form.querySelector('[name="add"]');
    const addButtonText = addButton?.querySelector('span');
    const spinner = form.querySelector('.loading__spinner');

    // Show loading state
    if (addButton) addButton.disabled = true;
    if (addButtonText) addButtonText.textContent = 'Wird hinzugefügt...';
    if (spinner) spinner.classList.remove('hidden');

    fetch('/cart/add.js', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      // Success - redirect to cart or show success message
      if (data.id) {
        // Trigger cart drawer or redirect
        if (typeof window.cartDrawer !== 'undefined') {
          window.cartDrawer.open();
        } else {
          window.location.href = '/cart';
        }
      }
    })
    .catch(error => {
      console.error('Error adding to cart:', error);
      // Show error message
      if (addButtonText) {
        addButtonText.textContent = 'Fehler - Erneut versuchen';
      }
    })
    .finally(() => {
      // Reset button state
      setTimeout(() => {
        if (addButton && this.currentVariant?.available) {
          addButton.disabled = false;
        }
        if (addButtonText && this.currentVariant?.available) {
          addButtonText.textContent = 'In den Einkaufswagen';
        }
        if (spinner) {
          spinner.classList.add('hidden');
        }
      }, 1000);
    });
  }
}

// Register the custom element
customElements.define('bike-configurator', BikeConfigurator);

// Also handle the variant-radios component from Shopify's system
class VariantRadios extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterProductForm();
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked)?.value;
    });
  }

  updateMasterProductForm() {
    const masterProductForm = document.querySelector(`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`);
    if (!masterProductForm) return;
    
    const variants = this.getVariantData();
    this.currentVariant = variants.find((variant) => {
      return !variant.options.map((option, index) => {
        return this.options[index] === option;
      }).includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGalleries = document.querySelectorAll(`[id^="MediaGallery-${this.dataset.section}"]`);
    mediaGalleries.forEach((mediaGallery) =>
      mediaGallery.setActiveMedia(`${this.dataset.section}-${this.currentVariant.featured_media.id}`, true)
    );

    const modalContent = document.querySelector(`#ProductModal-${this.dataset.section} .product-media-modal__content`);
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector(`[data-media-id="${this.currentVariant.featured_media.id}"]`);
    if (newMediaModal) modalContent.prepend(newMediaModal);

    // Update configurator images
    const configuratorImages = document.querySelectorAll('.configurator-image');
    configuratorImages.forEach(img => img.classList.remove('active'));
    
    const activeImage = document.querySelector(`[data-media-id="${this.currentVariant.featured_media.id}"]`);
    if (activeImage) {
      activeImage.classList.add('active');
    }
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(variant => this.querySelector(':checked').value === variant.option1);
    const inputWrappers = [...this.querySelectorAll('.product-form__input')];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')];
      const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants.filter(variant => variant.available && variant[`option${index}`] === previousOptionSelected).map(variantOption => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach(input => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.innerText = input.getAttribute('value');
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace('[value]', input.getAttribute('value'));
      }
    });
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;

    fetch(`${this.dataset.url}?variant=${requestedVariantId}&section_id=${sectionId}`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const source = html.getElementById(`price-${sectionId}`);
        const skuSource = html.getElementById(`Sku-${sectionId}`);
        const skuDestination = document.getElementById(`Sku-${this.dataset.section}`);
        const inventorySource = html.getElementById(`Inventory-${sectionId}`);
        const inventoryDestination = document.getElementById(`Inventory-${this.dataset.section}`);

        const volumePricingSource = html.getElementById(`Volume-${sectionId}`);

        const pricePerItemDestination = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
        const pricePerItemSource = html.getElementById(`Price-Per-Item-${sectionId}`);

        const volumePricingDestination = document.getElementById(`Volume-${this.dataset.section}`);
        if (source && destination) destination.innerHTML = source.innerHTML;
        if (inventorySource && inventoryDestination) inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle('visibility-hidden', skuSource.classList.contains('visibility-hidden'));
        }

        if (volumePricingSource && volumePricingDestination) {
          volumePricingDestination.innerHTML = volumePricingSource.innerHTML;
        }

        if (pricePerItemSource && pricePerItemDestination) {
          pricePerItemDestination.innerHTML = pricePerItemSource.innerHTML;
          pricePerItemDestination.classList.toggle('visibility-hidden', pricePerItemSource.classList.contains('visibility-hidden'));
        }

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove('visibility-hidden');

        if (inventoryDestination) inventoryDestination.classList.toggle('visibility-hidden', inventorySource.classList.contains('visibility-hidden'));

        this.toggleAddButton(!this.currentVariant.available, window.variantStrings.soldOut);

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId: this.dataset.section,
            html,
            variant: this.currentVariant,
            url: `${this.dataset.url}?variant=${requestedVariantId}`
          }
        });
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;

    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add('visibility-hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }
}

customElements.define('variant-radios', VariantRadios); 