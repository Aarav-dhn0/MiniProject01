/* Frontend behavior; startInspection() stores the selected image through the Flask endpoint. */
(() => {
  const STORAGE_KEY = 'inspectpro.inspection.v1';
  const MAX_BYTES = 10 * 1024 * 1024;
  const accepted = ['image/jpeg', 'image/png'];
  const readState = () => { try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } };
  const saveState = (state) => sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const formatBytes = (bytes) => bytes < 1024 * 1024 ? (bytes / 1024).toFixed(0) + ' KB' : (bytes / 1024 / 1024).toFixed(2) + ' MB';
  const page = document.body.dataset.page;

  if (page === 'inspect') initInspect();
  if (page === 'processing') simulateProcessing();
  if (page === 'result') displayResult();

  function initInspect() {
    const input = document.getElementById('imageInput');
    const zone = document.getElementById('dropZone');
    const analyze = document.getElementById('analyzeButton');
    let current = null;
    input.addEventListener('change', () => handleImageUpload(input.files[0]));
    zone.addEventListener('click', (event) => { if (!event.target.closest('button,label,input')) input.click(); });
    zone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
    ['dragenter','dragover'].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.remove('dragover'); }));
    zone.addEventListener('drop', event => handleImageUpload(event.dataTransfer.files[0]));
    document.getElementById('removeImage').addEventListener('click', removeImage);
    analyze.addEventListener('click', startInspection);
    function handleImageUpload(file) {
      if (!file) return;
      const error = validateImage(file);
      if (error) { showError(error); input.value = ''; return; }
      current = file;
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          document.getElementById('previewImage').src = reader.result;
          document.getElementById('fileName').textContent = file.name;
          document.getElementById('fileDetails').textContent = formatBytes(file.size) + ' · ' + image.naturalWidth + ' × ' + image.naturalHeight + ' px';
          document.getElementById('uploadEmpty').classList.add('d-none');
          document.getElementById('previewContent').classList.remove('d-none');
          document.getElementById('uploadError').classList.add('d-none');
          analyze.disabled = false;
          analyze.nextElementSibling.textContent = 'Ready to start inspection';
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
    function validateImage(file) {
      if (!accepted.includes(file.type) && !/\.(jpe?g|png)$/i.test(file.name)) return 'Please choose a JPG, JPEG, or PNG image.';
      if (!accepted.includes(file.type) && !/\.(jpe?g|png)$/i.test(file.name)) return 'This image format is not supported.';
      if (file.size > MAX_BYTES) return 'This image is over 10 MB. Choose a smaller file.';
      if (file.size === 0) return 'This file appears to be empty. Choose another image.';
      return '';
    }
    function showError(message) { const box = document.getElementById('uploadError'); box.textContent = message; box.classList.remove('d-none'); }
    function removeImage() { current = null; input.value = ''; document.getElementById('previewImage').removeAttribute('src'); document.getElementById('previewContent').classList.add('d-none'); document.getElementById('uploadEmpty').classList.remove('d-none'); analyze.disabled = true; analyze.nextElementSibling.textContent = 'Choose an image to continue'; document.getElementById('uploadError').classList.add('d-none'); }
    async function startInspection() {
      if (!current) { showError('Choose an image before starting the inspection.'); return; }
      analyze.disabled = true;
      analyze.textContent = 'Saving image…';
      try {
        const formData = new FormData();
        formData.append('image', current, current.name);
        const response = await fetch('/inspect', { method: 'POST', body: formData });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'The image could not be saved. Please try again.');
        const preview = document.getElementById('previewImage');
        saveState({ inspectionId: result.inspection_id, fileName: current.name, fileSize: current.size, width: preview.naturalWidth, height: preview.naturalHeight });
        window.location.href = 'processing.html';
      } catch (error) {
        showError(error.message || 'Could not connect to the local server. Start the Flask app and try again.');
        analyze.disabled = false;
        analyze.textContent = 'Analyze Product';
      }
    }
  }
  function simulateProcessing() {
    const state = readState();
    if (!state?.inspectionId) { window.location.replace('inspect.html'); return; }
    document.getElementById('processingImage').src = "/inspection/" + state.inspectionId + "/image";
    const stages = [...document.querySelectorAll('#pipelineList li')];
    const steps = [2,3,4]; let index = 0;
    const advance = () => {
      if (index >= steps.length) { setTimeout(() => { window.location.href = 'result.html'; }, 550); return; }
      const stageIndex = steps[index];
      stages.forEach((stage, i) => { stage.classList.toggle('active', i === stageIndex); if (i === stageIndex) { stage.querySelector('.stage-icon').textContent = '◌'; stage.querySelector('.stage-state').textContent = 'IN PROGRESS'; } });
      document.getElementById('progressCount').textContent = String(stageIndex + 1).padStart(2,'0') + ' / 05';
      document.getElementById('progressBar').style.width = ((stageIndex + 1) / 5 * 100) + '%';
      setTimeout(() => { stages[stageIndex].classList.remove('active'); stages[stageIndex].classList.add('complete'); stages[stageIndex].querySelector('.stage-icon').textContent = '✓'; stages[stageIndex].querySelector('.stage-state').textContent = 'COMPLETE'; index++; advance(); }, 1100);
    };
    setTimeout(advance, 450);
  }
  function displayResult() {
    const state = readState();
    if (!state?.inspectionId) { window.location.replace('inspect.html'); return; }
    const imageUrl = "/inspection/" + state.inspectionId + "/image";
    document.getElementById('originalResultImage').src = imageUrl;
    document.getElementById('processedResultImage').src = imageUrl;
    document.querySelectorAll('[data-placeholder]').forEach(button => button.addEventListener('click', () => { document.getElementById('actionMessage').textContent = button.dataset.placeholder + ' is a placeholder in this frontend prototype.'; }));
  }
})();







