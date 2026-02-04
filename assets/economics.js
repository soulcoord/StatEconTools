
    (function(){
      let currentHighlight = null;
      let historyRecords = JSON.parse(localStorage.getItem('calcHistory')) || [];
      let diagramItems = JSON.parse(localStorage.getItem('diagramItems')) || [];
      let editingIndex = -1;
      let tooltipList = [];

      // Drag functionality variables (Calculator Window)
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;
      let xOffset = 0;
      let yOffset = 0;

      function initTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => {
            return new bootstrap.Tooltip(tooltipTriggerEl, {
                boundary: document.body
            });
            });
        }
      }

      function calculateFactors() {
        const rateInput = document.getElementById('interestRate').value;
        const rate = parseFloat(rateInput) / 100;
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        if (!rate || rate <= 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="9" class="text-center py-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-info-circle mb-2" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                </svg>
                <p>請輸入有效利率以顯示數據</p>
                <button class="btn btn-sm btn-outline-primary" onclick="document.getElementById('interestRate').focus()">輸入利率</button>
              </td>
            </tr>`;
          return;
        }
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">計算中...</span>
              </div>
              <p class="mt-2">計算中...</p>
            </td>
          </tr>`;
        setTimeout(() => {
          tbody.innerHTML = '';
          for (let n = 1; n <= 60; n++) {
            const F_P = Math.pow(1 + rate, n);
            const P_F = 1 / F_P;
            const A_P = (rate * F_P) / (F_P - 1);
            const P_A = 1 / A_P;
            const F_A = (F_P - 1) / rate;
            const A_F = rate / (F_P - 1);
            const P_G = ((F_A - n) / (rate * rate)) * P_F;
            const A_G = (1 / rate) - (n / (F_P - 1));

            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${n}</td>
              <td>${F_P.toFixed(6)}</td>
              <td>${P_F.toFixed(6)}</td>
              <td>${A_P.toFixed(6)}</td>
              <td>${P_A.toFixed(6)}</td>
              <td>${F_A.toFixed(6)}</td>
              <td>${A_F.toFixed(6)}</td>
              <td>${P_G.toFixed(6)}</td>
              <td>${A_G.toFixed(6)}</td>
            `;
            tbody.appendChild(row);
          }
          const nSelect = document.getElementById('selectedN');
          nSelect.innerHTML = '';
          for (let i = 1; i <= 60; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            nSelect.appendChild(option);
          }
        }, 300);
      }
      function searchFactor() {
        const factor = document.getElementById('factorType').value;
        const nValue = document.getElementById('searchN').value;
        const table = document.querySelector('.factor-table');

        if (!nValue || nValue < 1 || nValue > 60) {
          showNotification('請輸入有效的期數 (1-60)', 'warning');
          return;
        }

        const rows = table.rows;
        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].cells;
          if (cells[0].textContent === nValue) {
            if (currentHighlight) currentHighlight.classList.remove('highlight-cell');
            const headerCells = document.querySelectorAll('.factor-table thead th');
            let headerIndex = -1;
            for (let j = 0; j < headerCells.length; j++) {
              if (headerCells[j].textContent.trim() === factor) {
                headerIndex = j;
                break;
              }
            }
            if (headerIndex !== -1) {
              cells[headerIndex].classList.add('highlight-cell');
              currentHighlight = cells[headerIndex];
              cells[headerIndex].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
              showNotification(`已找到 ${factor} 在期數 ${nValue} 的值：${cells[headerIndex].textContent}`, 'success');
            }
            break;
          }
        }
      }
      function showNotification(message, type = 'info') {
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
          notificationContainer = document.createElement('div');
          notificationContainer.id = 'notificationContainer';
          notificationContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 350px;
          `;
          document.body.appendChild(notificationContainer);
        }
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} fade-in`;
        notification.style.cssText = `
          background: var(--surface-strong);
          color: var(--text-primary);
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-bottom: 10px;
          border-left: 4px solid var(--accent);
          box-shadow: var(--shadow-md);
          display: flex;
          align-items: center;
          gap: 10px;
        `;
        let icon = '';
        switch(type) {
          case 'success':
            icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="var(--success)" class="bi bi-check-circle" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                      <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                    </svg>`;
            break;
          case 'warning':
            icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="var(--warning)" class="bi bi-exclamation-triangle" viewBox="0 0 16 16">
                      <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z"/>
                      <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995z"/>
                    </svg>`;
            break;
          default:
            icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="var(--accent)" class="bi bi-info-circle" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                      <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                    </svg>`;
        }

        notification.innerHTML = `
          ${icon}
          <div>${message}</div>
          <button type="button" class="btn-close btn-close-white btn-sm ms-auto" style="opacity: 0.7;" onclick="this.parentElement.remove()"></button>
        `;

        notificationContainer.appendChild(notification);
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transform = 'translateX(100%)';
          notification.style.transition = 'all 0.5s ease';
          setTimeout(() => notification.remove(), 500);
        }, 4000);
      }
      function updateFactorValue() {
        const n = document.getElementById('selectedN').value;
        const factor = document.getElementById('selectedFactor').value;
        const rows = document.querySelector('.factor-table').rows;

        // Update Formula Display
        updateFormulaDisplay(factor);

        for (let i = 1; i < rows.length; i++) {
          if (rows[i].cells[0].textContent === n) {
            const headerCells = document.querySelectorAll('.factor-table thead th');
            let factorIndex = -1;
            for (let j = 0; j < headerCells.length; j++) {
              if (headerCells[j].textContent === factor) {
                factorIndex = j;
                break;
              }
            }
            if (factorIndex !== -1) {
              document.getElementById('selectedValue').value = parseFloat(rows[i].cells[factorIndex].textContent).toFixed(6);
            }
            break;
          }
        }
      }

      function updateFormulaDisplay(factor) {
        const el = document.getElementById('formulaDisplay');
        let formula = '';
        switch(factor) {
          case 'F/P': formula = 'F = P(1 + i)<sup>n</sup>'; break;
          case 'P/F': formula = 'P = F(1 + i)<sup>-n</sup>'; break;
          case 'A/P': formula = 'A = P [i(1+i)<sup>n</sup> / ((1+i)<sup>n</sup> - 1)]'; break;
          case 'P/A': formula = 'P = A [((1+i)<sup>n</sup> - 1) / i(1+i)<sup>n</sup>]'; break;
          case 'F/A': formula = 'F = A [((1+i)<sup>n</sup> - 1) / i]'; break;
          case 'A/F': formula = 'A = F [i / ((1+i)<sup>n</sup> - 1)]'; break;
          case 'P/G': formula = 'P = G [(1+i)<sup>n</sup> - in - 1] / [i<sup>2</sup>(1+i)<sup>n</sup>]'; break;
          case 'A/G': formula = 'A = G [1/i - n/((1+i)<sup>n</sup> - 1)]'; break;
          default: formula = '';
        }
        el.innerHTML = formula;
      }

      function performCalculation() {
        const value = parseFloat(document.getElementById('selectedValue').value);
        const amount = parseFloat(document.getElementById('inputAmount').value);
        const factor = document.getElementById('selectedFactor').value;
        const n = document.getElementById('selectedN').value;
        const compoundFactor = document.getElementById('compoundFactor').value;
        const rate = parseFloat(document.getElementById('interestRate').value) / 100;
        const resultField = document.getElementById('calculationFlow');

        if (isNaN(value) || isNaN(amount)) {
          resultField.innerHTML = `
            <div class="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="var(--warning)" class="bi bi-exclamation-triangle mb-2" viewBox="0 0 16 16">
                <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z"/>
                <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995z"/>
              </svg>
              <div>請輸入有效數值以查看計算流程</div>
            </div>`;
          showNotification('請輸入有效金額和因子值', 'warning');
          document.getElementById('inputAmount').focus();
          return;
        }

        let result = value * amount;
        let compoundResult = null;
        let compoundValue = null;

        if (compoundFactor) {
          const rows = document.querySelector('.factor-table').rows;
          for (let i = 1; i < rows.length; i++) {
            if (rows[i].cells[0].textContent === n) {
              const headerCells = document.querySelectorAll('.factor-table thead th');
              let compoundIndex = -1;
              for (let j = 0; j < headerCells.length; j++) {
                if (headerCells[j].textContent === compoundFactor) {
                  compoundIndex = j;
                  break;
                }
              }
              if (compoundIndex !== -1) {
                compoundValue = parseFloat(rows[i].cells[compoundIndex].textContent);
                compoundResult = result * compoundValue;
              }
              break;
            }
          }
        }

        const finalResult = compoundResult || result;
        document.getElementById('calculationResult').value = finalResult.toLocaleString('zh-Hant', { maximumFractionDigits: 4 });

        let flowHTML = '';
        flowHTML += `<span class="flow-item">${amount.toLocaleString('zh-Hant')}</span>`;
        flowHTML += `<span class="flow-operator">×</span>`;
        flowHTML += `<span class="flow-item">${factor} (${value.toFixed(6)})</span>`;

        if (compoundFactor && compoundValue) {
          flowHTML += `<span class="flow-operator">×</span>`;
          flowHTML += `<span class="flow-item">${compoundFactor} (${compoundValue.toFixed(6)})</span>`;
        }

        flowHTML += `<span class="flow-operator">=</span>`;
        flowHTML += `<span class="flow-item result-highlight">${finalResult.toLocaleString('zh-Hant', { maximumFractionDigits: 4 })}</span>`;

        resultField.innerHTML = flowHTML;
        const record = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          rate: rate * 100,
          n,
          amount,
          factor,
          factorValue: value,
          compoundFactor: compoundFactor || '無',
          compoundValue: compoundValue,
          result: finalResult
        };

        if (editingIndex === -1) {
          historyRecords.unshift(record);
          showNotification('計算結果已儲存至歷史記錄', 'success');
        } else {
          historyRecords[editingIndex] = record;
          editingIndex = -1;
          document.getElementById('calculateBtn').innerHTML = `立即計算`;
          showNotification('歷史記錄已更新', 'success');
        }
        if (historyRecords.length > 100) {
          historyRecords = historyRecords.slice(0, 100);
        }
        localStorage.setItem('calcHistory', JSON.stringify(historyRecords));

        updateHistoryList();
      }
      function filterHistory() {
        const searchValue = document.getElementById('historySearch').value.toLowerCase();
        const filteredRecords = historyRecords.filter(record =>
          record.rate.toString().includes(searchValue) ||
          record.n.toString().includes(searchValue) ||
          record.factor.toLowerCase().includes(searchValue) ||
          record.compoundFactor.toLowerCase().includes(searchValue)
        );
        updateHistoryList(filteredRecords);
      }
      function formatDateTime(isoString) {
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      }
      function updateHistoryList(filteredRecords = historyRecords) {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';

        if (filteredRecords.length === 0) {
          historyList.innerHTML = `
            <div class="no-history">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" class="bi bi-clock-history mb-3" viewBox="0 0 16 16">
                <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.956 7.956 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z"/>
                <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z"/>
                <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"/>
              </svg>
              <p>尚無計算歷史記錄<br>計算後的結果將顯示在此處</p>
            </div>`;
          return;
        }

        filteredRecords.forEach((record, index) => {
          const item = document.createElement('div');
          item.className = 'history-item';
          item.setAttribute('data-record-id', record.id);

          let timestampDisplay = '';
          if (record.timestamp) {
            timestampDisplay = `<div class="text-tertiary small mb-2">${formatDateTime(record.timestamp)}</div>`;
          }

          item.innerHTML = `
            ${timestampDisplay}
            <div class="history-details">
              <div class="history-detail-item">
                <span class="history-detail-label">利率</span>
                <span class="history-detail-value">${record.rate.toFixed(2)}%</span>
              </div>
              <div class="history-detail-item">
                <span class="history-detail-label">期數</span>
                <span class="history-detail-value">${record.n}</span>
              </div>
              <div class="history-detail-item">
                <span class="history-detail-label">金額</span>
                <span class="history-detail-value">${record.amount.toLocaleString('zh-Hant')}</span>
              </div>
              <div class="history-detail-item">
                <span class="history-detail-label">因子</span>
                <span class="history-detail-value">${record.factor}</span>
              </div>
            </div>

            <div class="history-flow">
              <span class="flow-item">${record.amount.toLocaleString('zh-Hant')}</span>
              <span class="flow-operator">×</span>
              <span class="flow-item">${record.factor} (${record.factorValue.toFixed(6)})</span>
              ${record.compoundFactor !== '無' ? `
                <span class="flow-operator">×</span>
                <span class="flow-item">${record.compoundFactor} (${record.compoundValue.toFixed(6)})</span>` : ''}
              <span class="flow-operator">=</span>
              <span class="flow-item result-highlight">${record.result.toLocaleString('zh-Hant', { maximumFractionDigits: 4 })}</span>
            </div>

            <div class="history-actions">
              <button class="btn btn-sm btn-outline-success history-add-diagram-btn" data-index="${index}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-plus-lg me-1" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
                </svg>
                加入本題
              </button>
              <button class="btn btn-sm btn-outline-primary history-edit-btn" data-index="${index}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-pencil me-1" viewBox="0 0 16 16">
                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                </svg>
                編輯
              </button>
              <button class="btn btn-sm btn-outline-danger history-delete-btn" data-index="${index}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-trash me-1" viewBox="0 0 16 16">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                  <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                </svg>
                刪除
              </button>
            </div>
          `;
          historyList.appendChild(item);
          item.querySelector('.history-add-diagram-btn').addEventListener('click', function() {
              addToDiagram(this.getAttribute('data-index'));
          });
          item.querySelector('.history-edit-btn').addEventListener('click', function() {
            editRecord(this.getAttribute('data-index'));
          });

          item.querySelector('.history-delete-btn').addEventListener('click', function() {
            confirmDelete(this.getAttribute('data-index'));
          });
        });
      }
      function editRecord(index) {
        const record = historyRecords[index];
        editingIndex = index;

        document.getElementById('inputAmount').value = record.amount;
        document.getElementById('interestRate').value = record.rate;
        document.getElementById('selectedN').value = record.n;
        document.getElementById('selectedFactor').value = record.factor;
        document.getElementById('compoundFactor').value = record.compoundFactor === '無' ? '' : record.compoundFactor;

        calculateFactors();
        setTimeout(() => {
          updateFactorValue();
          showCalculatorWindow();
          document.getElementById('calculateBtn').innerHTML = `更新記錄`;
          document.getElementById('inputAmount').focus();
        }, 350);
      }
      function confirmDelete(index) {
        const swalWithBootstrapButtons = Swal.mixin({
          customClass: {
            confirmButton: 'btn btn-danger ms-2',
            cancelButton: 'btn btn-secondary'
          },
          buttonsStyling: false
        });

        swalWithBootstrapButtons.fire({
          title: '確定要刪除?',
          text: "此操作無法復原!",
          icon: 'warning',
          background: '#1A1A1A',
          color: '#FFFFFF',
          showCancelButton: true,
          confirmButtonText: '是，刪除!',
          cancelButtonText: '取消',
          reverseButtons: true
        }).then((result) => {
          if (result.isConfirmed) {
            historyRecords.splice(index, 1);
            localStorage.setItem('calcHistory', JSON.stringify(historyRecords));
            updateHistoryList();
            showNotification('記錄已刪除', 'success');
          }
        });
      }
      function confirmClearHistory() {
        if (confirm('確定要清空所有歷史記錄嗎？此操作無法撤銷。')) {
          historyRecords = [];
          localStorage.setItem('calcHistory', JSON.stringify(historyRecords));
          updateHistoryList();
          showNotification('所有歷史記錄已清空', 'success');
        }
      }
      function toggleSidebar() {
        const sidebar = document.getElementById('historySidebar');
        sidebar.classList.toggle('active');
        if (sidebar.classList.contains('active')) {
             document.getElementById('diagramSidebar').classList.remove('active');
        }
      }

      function toggleDiagramSidebar() {
        const sidebar = document.getElementById('diagramSidebar');
        const mobileWarning = document.getElementById('diagramMobileWarning');
        sidebar.classList.toggle('active');

        if (sidebar.classList.contains('active')) {
            document.getElementById('historySidebar').classList.remove('active');
            renderDiagram();

            // Check mobile
            if (window.innerWidth <= 768) {
                mobileWarning.style.display = 'block';
            } else {
                mobileWarning.style.display = 'none';
            }
        }
      }

      function addToDiagram(index) {
          const record = historyRecords[index];
          // Create a deep copy or new object for the diagram item
          // Default year is sequential: 0, 1, 2... based on current count
          // OR Requirements say: "1st -> Year 0, 2nd -> Year 1..."

          const newDiagramItem = {
              id: Date.now() + Math.random(), // Unique ID for diagram item
              recordId: record.id,
              originalRecord: record,
              year: diagramItems.length, // Default sequential year
              type: 'income' // Default to income, user can change
          };

          diagramItems.push(newDiagramItem);
          saveDiagramItems();

          showNotification('已加入現金流量圖 (本題)', 'success');

          // Open the diagram sidebar if not open?
          // Requirement: "User adds... added record appears in drawer".
          // It doesn't explicitly say "auto open", but it's good UX or at least update it if open.
          const sidebar = document.getElementById('diagramSidebar');
          if (sidebar.classList.contains('active')) {
              renderDiagram();
          } else {
             // Maybe show a hint or auto open? Let's just notify for now.
             // toggleDiagramSidebar(); // Optional: Auto open
          }
      }

      function saveDiagramItems() {
          localStorage.setItem('diagramItems', JSON.stringify(diagramItems));
      }

      function renderDiagram() {
          const container = document.getElementById('diagramContent');
          container.innerHTML = '';

          if (diagramItems.length === 0) {
              container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-graph-up-arrow mb-3" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M0 0h1v15h15v1H0V0Zm10 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4.9l-3.613 4.417a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61L13.445 4H10.5a.5.5 0 0 1-.5-.5Z"/>
                    </svg>
                    <p>本題尚無現金流資料</p>
                    <p class="small">請從歷史記錄中點擊「加入本題」</p>
                </div>
              `;
              return;
          }

          // Determine max year needed
          let maxYear = 0;
          diagramItems.forEach(item => {
              if (item.year > maxYear) maxYear = item.year;
              // Also consider N from the record if we want to show full range?
              // But requirements say "X axis is years 0..max(N)".
              // Wait, dragging adjusts "occurrence year".
              // Let's ensure we have enough slots.
              // Let's use max(current item years) + 1 buffer, or at least some reasonable number.
              // Also check the record's N.
              const n = parseInt(item.originalRecord.n);
              if (n > maxYear) maxYear = n;
          });

          // Ensure at least year 0 to maxYear
          // Generate Year Slots
          for (let y = 0; y <= maxYear + 1; y++) {
              const yearSlot = document.createElement('div');
              yearSlot.className = 'year-slot';
              yearSlot.setAttribute('data-year', y);

              // Year Label
              const label = document.createElement('div');
              label.className = 'year-label';
              label.textContent = `Year ${y}`;
              yearSlot.appendChild(label);

              // Year Content (Drop Zone)
              const content = document.createElement('div');
              content.className = 'year-content';
              content.setAttribute('data-year', y);

              // Add Drag/Drop events to the Drop Zone
              content.addEventListener('dragover', handleDragOver);
              content.addEventListener('dragleave', handleDragLeave);
              content.addEventListener('drop', handleDrop);

              // Find items for this year
              const itemsInYear = diagramItems.filter(item => item.year === y);
              itemsInYear.forEach(item => {
                  const card = createCardElement(item);
                  content.appendChild(card);
              });

              yearSlot.appendChild(content);
              container.appendChild(yearSlot);
          }
      }

      function createCardElement(item) {
          const card = document.createElement('div');
          card.className = `cf-card ${item.type}`; // income or expense
          card.setAttribute('draggable', 'true');
          card.setAttribute('data-id', item.id);

          // Drag Start
          card.addEventListener('dragstart', handleCardDragStart);
          card.addEventListener('dragend', handleCardDragEnd);

          const record = item.originalRecord;
          const formattedAmount = record.amount.toLocaleString('zh-Hant');

          card.innerHTML = `
            <div class="cf-card-header">
                <span class="cf-type">${record.factor} (N=${record.n})</span>
                <button class="cf-delete-btn" title="從本題移除" onclick="removeFromDiagram(${item.id})">×</button>
            </div>
            <div class="cf-amount">
                ${item.type === 'expense' ? '-' : ''}${formattedAmount}
            </div>
            <div class="cf-controls">
                <button class="cf-toggle-btn ${item.type === 'income' ? 'active-income' : ''}"
                    onclick="updateItemType(${item.id}, 'income')">收入 (+)</button>
                <button class="cf-toggle-btn ${item.type === 'expense' ? 'active-expense' : ''}"
                    onclick="updateItemType(${item.id}, 'expense')">支出 (-)</button>
            </div>
          `;

          // Tooltip for Interest Rate
          card.setAttribute('data-bs-toggle', 'tooltip');
          card.setAttribute('title', `利率: ${record.rate.toFixed(2)}%, 結果: ${record.result}`);

          return card;
      }

      // Global functions for inline onclicks needs to be attached to window or handled differently.
      // Since this is inside an IIFE, I need to expose them or add event listeners differently.
      // I will attach them to window for simplicity in this context, or use event delegation.
      // Using window for helper functions called from HTML string.
      window.removeFromDiagram = function(id) {
          diagramItems = diagramItems.filter(i => i.id !== id);
          saveDiagramItems();
          renderDiagram();
      };

      window.updateItemType = function(id, type) {
          const item = diagramItems.find(i => i.id === id);
          if (item) {
              item.type = type;
              saveDiagramItems();
              renderDiagram();
          }
      };

      function confirmClearDiagram() {
          if (confirm('確定要清空本題所有現金流資料嗎？')) {
              diagramItems = [];
              saveDiagramItems();
              renderDiagram();
              showNotification('本題資料已清空', 'success');
          }
      }

      // Drag and Drop Logic for Diagram
      let draggedItem = null;

      function handleCardDragStart(e) {
          draggedItem = this;
          this.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', this.getAttribute('data-id'));
      }

      function handleCardDragEnd(e) {
          this.classList.remove('dragging');
          draggedItem = null;
          document.querySelectorAll('.year-content').forEach(el => el.classList.remove('drag-over'));
      }

      function handleDragOver(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          this.classList.add('drag-over');
      }

      function handleDragLeave(e) {
          this.classList.remove('drag-over');
      }

      function handleDrop(e) {
          e.preventDefault();
          this.classList.remove('drag-over');

          const id = parseFloat(e.dataTransfer.getData('text/plain'));
          const targetYear = parseInt(this.getAttribute('data-year'));

          const item = diagramItems.find(i => i.id === id);
          if (item) {
              item.year = targetYear;
              saveDiagramItems();
              renderDiagram();
          }
      }

      // Dragging logic
      function dragStart(e) {
        if (e.target.closest('#dragHandle')) {
          initialX = e.clientX - xOffset;
          initialY = e.clientY - yOffset;
          if (e.target === document.getElementById('closeCalculatorBtn')) {
            return;
          }
          isDragging = true;
        }
      }

      function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
      }

      function drag(e) {
        if (isDragging) {
          e.preventDefault();
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
          xOffset = currentX;
          yOffset = currentY;
          setTranslate(currentX, currentY, document.getElementById('calculatorWindow'));
        }
      }

      function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(calc(-50% + ${xPos}px), calc(-50% + ${yPos}px))`;
      }

      function copyResultToClipboard() {
        const result = document.getElementById('calculationResult').value;
        if (!result) return;
        navigator.clipboard.writeText(result).then(() => {
          showNotification('結果已複製到剪貼簿', 'success');
        }).catch(err => {
          showNotification('複製失敗', 'warning');
        });
      }

      function showCalculatorWindow() {
          const windowEl = document.getElementById('calculatorWindow');
          windowEl.style.display = 'block';
          // Force diagram update when opening
          updateFactorValue();
      }

      function hideCalculatorWindow() {
          const windowEl = document.getElementById('calculatorWindow');
          windowEl.style.display = 'none';
      }

      function setupTableCellEvents() {
        document.querySelector('.factor-table').addEventListener('click', function(e) {
          if (e.target.tagName === 'TD' && e.target.cellIndex > 0) {
            const n = e.target.parentElement.cells[0].textContent;
            const headerCells = document.querySelectorAll('.factor-table thead th');
            const factor = headerCells[e.target.cellIndex].textContent;
            const value = parseFloat(e.target.textContent);

            document.getElementById('selectedN').value = n;
            document.getElementById('selectedFactor').value = factor;
            document.getElementById('selectedValue').value = value.toFixed(6);
            if (currentHighlight) currentHighlight.classList.remove('highlight-cell');
            e.target.classList.add('highlight-cell');
            currentHighlight = e.target;

            showCalculatorWindow();
            document.getElementById('inputAmount').focus();
          }
        });
      }
      function setupTableSort() {
        const headerCells = document.querySelectorAll('.factor-table thead th');

        headerCells.forEach((th, index) => {
          if (index > 0) { // 跳過第一列 (N)
            th.addEventListener('click', function() {
              const table = th.closest('table');
              const tbody = table.querySelector('tbody');
              const rows = Array.from(tbody.querySelectorAll('tr'));
              headerCells.forEach(cell => {
                cell.classList.remove('sort-asc', 'sort-desc');
              });
              const isAscending = !this.classList.contains('sort-asc');

              this.classList.add(isAscending ? 'sort-asc' : 'sort-desc');
              rows.sort((a, b) => {
                const aValue = parseFloat(a.cells[index].textContent);
                const bValue = parseFloat(b.cells[index].textContent);
                return isAscending ? aValue - bValue : bValue - aValue;
              });
              rows.forEach(row => tbody.appendChild(row));
            });
          }
        });
      }
      function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
          if (e.altKey && e.key === 'f') {
            e.preventDefault();
            document.getElementById('factorType').focus();
          }
          if (e.altKey && e.key === 'n') {
            e.preventDefault();
            document.getElementById('searchN').focus();
          }
          if (e.altKey && e.key === 'i') {
            e.preventDefault();
            document.getElementById('interestRate').focus();
          }
          if (e.altKey && e.key === 's') {
            e.preventDefault();
            document.getElementById('searchFactorBtn').click();
          }
          if (e.altKey && e.key === 'h') {
            e.preventDefault();
            toggleSidebar();
          }
          if (e.key === 'Escape') {
            const sidebar = document.getElementById('historySidebar');
            if (sidebar.classList.contains('active')) {
              sidebar.classList.remove('active');
            }
            hideCalculatorWindow();
          }
        });
      }
      function initUIEvents() {
        document.getElementById('searchFactorBtn').addEventListener('click', searchFactor);
        document.getElementById('searchN').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            searchFactor();
          }
        });

        document.getElementById('interestRate').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            calculateFactors();
          }
        });
        document.getElementById('interestRate').addEventListener('change', calculateFactors);
        document.getElementById('selectedFactor').addEventListener('change', updateFactorValue);
        document.getElementById('selectedN').addEventListener('change', updateFactorValue);
        document.getElementById('calculateBtn').addEventListener('click', performCalculation);
        document.getElementById('inputAmount').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            performCalculation();
          }
        });
        document.getElementById('compoundFactor').addEventListener('change', function() {
          if (this.value) {
            updateFactorValue();
          }
        });
        document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
        document.getElementById('closeSidebarBtn').addEventListener('click', toggleSidebar);
        document.getElementById('clearHistoryBtn').addEventListener('click', confirmClearHistory);
        document.getElementById('historySearch').addEventListener('input', filterHistory);

        // Diagram Events
        document.getElementById('diagramToggle').addEventListener('click', toggleDiagramSidebar);
        document.getElementById('closeDiagramBtn').addEventListener('click', toggleDiagramSidebar);
        document.getElementById('clearDiagramBtn').addEventListener('click', confirmClearDiagram);

        // Window events
        document.getElementById('closeCalculatorBtn').addEventListener('click', hideCalculatorWindow);
        document.getElementById('copyResultBtn').addEventListener('click', copyResultToClipboard);

        // Drag events
        const dragHandle = document.getElementById('dragHandle');
        dragHandle.addEventListener('mousedown', dragStart);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('mousemove', drag);
      }
      function initPage() {
        initTooltips();
        initUIEvents();
        setupTableCellEvents();
        setupTableSort();
        setupKeyboardShortcuts();
        const urlParams = new URLSearchParams(window.location.search);
        const defaultRate = urlParams.get('rate');

        if (defaultRate) {
          document.getElementById('interestRate').value = defaultRate;
        } else {
          document.getElementById('interestRate').value = 5;
        }
        calculateFactors();
        updateHistoryList();
      }
      document.addEventListener('DOMContentLoaded', initPage);
    })();
