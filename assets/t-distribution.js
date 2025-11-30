
        const alphaValues = [0.1, 0.05, 0.025, 0.01, 0.005];
        const elements = {
            tableBody: document.getElementById('tTableBody'),
            loading: document.getElementById('loading'),
            dfInput: document.getElementById('dfSearch'),
            searchBtn: document.getElementById('searchBtn'),
            message: document.getElementById('message'),
            messageText: document.getElementById('messageText'),
            backToTop: document.getElementById('backToTop')
        };

        function toggleLoading(show) {
            elements.loading.classList.toggle('show', show);
        }

        function generateTable() {
            toggleLoading(true);
            elements.tableBody.innerHTML = '';

            setTimeout(() => {
                for (let df = 1; df <= 100; df++) {
                    const tr = document.createElement('tr');
                    tr.dataset.df = df;
                    tr.innerHTML = `
                        <td>${df}</td>
                        ${alphaValues.map(alpha => `<td>${jStat.studentt.inv(1 - alpha, df).toFixed(3)}</td>`).join('')}
                    `;
                    elements.tableBody.appendChild(tr);
                }
                toggleLoading(false);
            }, 250);
        }

        function showMessage(text, type = 'danger') {
            elements.messageText.textContent = text;
            elements.message.className = `alert alert--${type} show`;
            setTimeout(() => {
                elements.message.classList.remove('show');
            }, 2800);
        }

        function highlightRow(df) {
            const rows = document.querySelectorAll('#tTableBody tr');
            let found = false;

            rows.forEach(row => {
                if (parseInt(row.dataset.df, 10) === df) {
                    row.classList.add('highlighted');
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    found = true;
                    setTimeout(() => row.classList.remove('highlighted'), 3200);
                } else {
                    row.classList.remove('highlighted');
                }
            });

            return found;
        }

        function searchDF() {
            const df = parseInt(elements.dfInput.value, 10);

            if (isNaN(df) || df < 1 || df > 100) {
                showMessage('請輸入有效的自由度 (1-100)', 'danger');
                return;
            }

            const found = highlightRow(df);
            if (found) {
                showMessage(`已定位自由度 ${df}`, 'success');
            } else {
                showMessage(`未找到自由度 ${df}`, 'danger');
            }
        }

        elements.searchBtn.addEventListener('click', searchDF);

        elements.dfInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchDF();
            }
        });

        elements.dfInput.addEventListener('input', () => {
            const value = parseInt(elements.dfInput.value, 10);
            if (!isNaN(value) && value >= 1 && value <= 100) {
                highlightRow(value);
            }
        });

        window.addEventListener('scroll', () => {
            elements.backToTop.classList.toggle('show', window.scrollY > 320);
        });

        elements.backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('load', () => {
            generateTable();
        });
