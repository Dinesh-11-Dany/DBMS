// Frontend app.js - Vanilla JS
const form = document.getElementById('laptop-form');
const brandInput = document.getElementById('laptop_brand');
const seriesInput = document.getElementById('series');
const priceInput = document.getElementById('price');
const tableBody = document.getElementById('laptops-body');
const banners = document.getElementById('banners');
const clearAllBtn = document.getElementById('clear-all');

function showBanner(message, type = 'success'){
  clearBanners();
  const el = document.createElement('div');
  el.className = `banner ${type === 'error' ? 'error' : 'success'}`;
  el.textContent = message;
  banners.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 4000);
}

function clearBanners(){ banners.innerHTML = ''; }

function createRow(doc){
  const tr = document.createElement('tr');
  tr.dataset.id = doc._id || '';

  const brandTd = document.createElement('td'); brandTd.textContent = doc.laptop_brand;
  const seriesTd = document.createElement('td'); seriesTd.textContent = doc.series;
  const priceTd = document.createElement('td'); priceTd.textContent = typeof doc.price === 'number' ? doc.price.toFixed(2) : doc.price;
  const actionsTd = document.createElement('td');

  const delBtn = document.createElement('button');
  delBtn.className = 'btn secondary';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', ()=>{
    // Remove from UI immediately (local-only deletion)
    tr.remove();
  });

  actionsTd.appendChild(delBtn);
  tr.appendChild(brandTd);
  tr.appendChild(seriesTd);
  tr.appendChild(priceTd);
  tr.appendChild(actionsTd);
  return tr;
}

async function fetchLaptops(){
  try{
    const res = await fetch('/api/laptops');
    if(!res.ok) {
      const errText = await res.text();
      throw new Error(`Server error: ${res.status}`);
    }
    const data = await res.json();
    tableBody.innerHTML = '';
    data.forEach(d => tableBody.appendChild(createRow(d)));
  }catch(err){
    showBanner('Unable to load laptops from cloud.', 'error');
    console.error(err);
  }
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const laptop_brand = brandInput.value.trim();
  const series = seriesInput.value.trim();
  const priceVal = priceInput.value;

  if(!laptop_brand || !series || priceVal === ''){
    showBanner('All fields are required.', 'error');
    return;
  }

  const price = parseFloat(priceVal);
  if(Number.isNaN(price)){
    showBanner('Price must be a number.', 'error');
    return;
  }

  try{
    const res = await fetch('/api/laptops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ laptop_brand, series, price })
    });

    if(!res.ok){
      let errorMessage = 'Failed to save laptop.';
      try {
        const result = await res.json();
        errorMessage = result.error || errorMessage;
      } catch (e) {
        // Response was not JSON (e.g., HTML 404 page)
      }
      showBanner(errorMessage, 'error');
      return;
    }

    const result = await res.json();
    // Append to UI
    tableBody.appendChild(createRow(result));
    form.reset();
    showBanner('Laptop saved successfully.', 'success');
  }catch(err){
    console.error(err);
    showBanner('Network or server error while saving laptop.', 'error');
  }
});

clearAllBtn.addEventListener('click', async ()=>{
  if(!confirm('Are you sure you want to permanently clear all laptop records from the cloud?')) return;
  try{
    const res = await fetch('/api/laptops', { method: 'DELETE' });
    const result = await res.json();
    if(!res.ok){
      showBanner(result.error || 'Failed to clear records.', 'error');
      return;
    }
    tableBody.innerHTML = '';
    showBanner('All records cleared from cloud.', 'success');
  }catch(err){
    console.error(err);
    showBanner('Network or server error while clearing records.', 'error');
  }
});

// Auto-fetch on load
window.addEventListener('DOMContentLoaded', ()=>{
  fetchLaptops();
});
