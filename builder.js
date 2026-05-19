/* ===== Interactive Graph Builder ===== */
const Builder = {
    values: [],
    currentType: 'bar',
    survey: null,
    colors: ['#6C5CE7','#00CEC9','#FD79A8','#FDCB6E','#00B894','#E17055','#74B9FF','#A29BFE'],

    init(survey, type) {
        this.survey = survey;
        this.currentType = type;
        this.values = new Array(survey.options.length).fill(0);
        this.isDragging = false;
        this.dragIdx = -1;
        if (!this.docListenerAdded) {
            document.addEventListener('mouseup', () => this.isDragging = false);
            document.addEventListener('touchend', () => this.isDragging = false);
            this.docListenerAdded = true;
        }
        // 이전 그래프 타입의 이벤트 리스너를 완전히 제거하기 위해
        // 컨테이너를 cloneNode로 교체 (자식 없는 복사본 → 이벤트 없음)
        const old = document.querySelector('#builder-container');
        const c = old.cloneNode(false);
        old.parentNode.replaceChild(c, old);
        document.querySelector('#builder-feedback').innerHTML = '';
        if (type === 'bar') this.buildBar(c);
        else if (type === 'pie' || type === 'band') this.buildPercent(c, type);
        else if (type === 'line') this.buildLine(c);
        else if (type === 'pictograph') this.buildPicto(c);
    },

    /* ===== BAR CHART BUILDER ===== */
    buildBar(c) {
        const s = this.survey;
        let h = '<div class="bb-hint">📌 막대를 클릭하거나 드래그해서 높이를 맞춰 보세요!</div>';
        
        // Settings for axis
        h += '<div class="bb-axis-settings">';
        h += '<label>가로축: <input type="text" class="bb-axis-inp" id="x-axis-name" placeholder="예: 항목" value="항목"></label>';
        h += '<label>세로축: <input type="text" class="bb-axis-inp" id="y-axis-name" placeholder="예: 학생 수" value="학생 수"></label>';
        h += '<label>단위: <input type="text" class="bb-axis-inp" id="y-axis-unit" placeholder="예: 명" value="명"></label>';
        h += '<label>눈금 1칸 = <select class="bb-axis-inp" id="y-axis-step">';
        [1,2,5,10].forEach(n => h += `<option value="${n}">${n}</option>`);
        h += '</select></label>';
        h += '</div>';

        h += '<div class="bb-graph-area" style="position:relative; margin-top:25px;">';
        h += '<div class="bb-y-label-area" style="position:absolute; top:-25px; left:-10px; font-size:12px; font-weight:600; color:var(--text-secondary);">';
        h += '<span id="disp-y-title">학생 수</span> (<span id="disp-y-unit">명</span>)';
        h += '</div>';

        h += '<div id="bar-grid-container"></div>'; // Grid Area
        
        h += '<div class="bb-x-label-area" style="text-align:right; font-size:12px; font-weight:600; color:var(--text-secondary); margin-top:5px; padding-right:10px;">';
        h += '<span id="disp-x-title">항목</span>';
        h += '</div>';
        
        h += '</div>'; // bb-graph-area 닫기
        c.innerHTML = h;

        const self = this;
        // event listeners for settings
        const updateAxisText = () => {
            const yUnit = c.querySelector('#y-axis-unit').value || '';
            c.querySelector('#disp-x-title').textContent = c.querySelector('#x-axis-name').value || '';
            c.querySelector('#disp-y-title').textContent = c.querySelector('#y-axis-name').value || '';
            c.querySelector('#disp-y-unit').textContent = yUnit;
            s.options.forEach((opt, i) => {
                const v = c.querySelector(`#bbv-${i}`);
                if (v) v.textContent = self.values[i] + yUnit;
            });
        };
        c.querySelector('#x-axis-name').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-name').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-unit').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-step').addEventListener('change', () => {
            self.values = new Array(s.options.length).fill(0);
            self.renderBarGrid(c);
        });

        this.renderBarGrid(c);
    },

    renderBarGrid(c) {
        const s = this.survey;
        const container = c.querySelector('#bar-grid-container');
        if (!container) return;

        const yStep = +(c.querySelector('#y-axis-step')?.value || 1);
        const rawMax = Math.max(...s.votes, 1);
        let maxYCells = Math.ceil(rawMax / yStep) + 2;
        if (maxYCells < 4) maxYCells = 4;
        if (maxYCells > 20) maxYCells = 20;

        let h = '<div class="bb-wrapper"><div class="bb-yaxis">';
        for (let y = maxYCells; y >= 0; y--) h += `<div class="bb-yl">${y * yStep}</div>`;
        h += '</div><div class="bb-cols">';
        s.options.forEach((opt, i) => {
            h += `<div class="bb-col" data-idx="${i}">`;
            for (let y = maxYCells; y >= 1; y--) {
                const val = y * yStep;
                h += `<div class="bb-cell" data-y="${val}" data-i="${i}" style="background:${this.colors[i%8]}22"></div>`;
            }
            h += `<div class="bb-val" id="bbv-${i}">0명</div></div>`;
        });
        h += '</div></div><div class="bb-labels">';
        s.options.forEach(o => h += `<div class="bb-lb">${o}</div>`);
        h += '</div>';

        container.innerHTML = h;

        const self = this;
        const setVal = (idx, y) => { self.values[idx] = y; self.updateBar(c, idx); };
        const grid = c.querySelector('.bb-cols');
        
        grid.addEventListener('mousedown', e => {
            const cell = e.target.closest('.bb-cell');
            if (cell) { self.isDragging = true; self.dragIdx = +cell.dataset.i; setVal(self.dragIdx, +cell.dataset.y); e.preventDefault(); }
        });
        grid.addEventListener('mousemove', e => {
            if (!self.isDragging) return;
            const cell = e.target.closest('.bb-cell');
            if (cell && +cell.dataset.i === self.dragIdx) setVal(self.dragIdx, +cell.dataset.y);
        });
        grid.addEventListener('touchstart', e => {
            const cell = e.target.closest('.bb-cell');
            if (cell) { self.isDragging = true; self.dragIdx = +cell.dataset.i; setVal(self.dragIdx, +cell.dataset.y); }
        }, {passive:true});
        grid.addEventListener('touchmove', e => {
            if (!self.isDragging) return;
            const t = e.touches[0];
            const el = document.elementFromPoint(t.clientX, t.clientY);
            const cell = el?.closest('.bb-cell');
            if (cell && +cell.dataset.i === self.dragIdx) setVal(self.dragIdx, +cell.dataset.y);
        }, {passive:true});

        // Initialize display
        s.options.forEach((opt, i) => self.updateBar(c, i));
    },

    updateBar(c, idx) {
        c.querySelectorAll(`.bb-cell[data-i="${idx}"]`).forEach(cell => {
            const y = +cell.dataset.y;
            const filled = y <= this.values[idx];
            cell.classList.toggle('filled', filled);
            if (filled) cell.style.background = this.colors[idx%8] + 'CC';
            else cell.style.background = this.colors[idx%8] + '22';
        });
        const v = c.querySelector(`#bbv-${idx}`);
        const unitInp = c.querySelector('#y-axis-unit');
        const unit = unitInp ? unitInp.value : '명';
        if (v) v.textContent = this.values[idx] + unit;
    },

    /* ===== PERCENT BUILDER (Pie & Band) ===== */
    buildPercent(c, type) {
        const s = this.survey;
        const total = s.votes.reduce((a,b)=>a+b,0);
        let h = `<div class="bb-hint">📌 각 항목의 백분율(%)을 입력하세요! 합계가 100%가 되어야 해요.</div>`;
        h += '<div class="bp-inputs">';
        s.options.forEach((opt, i) => {
            h += `<div class="bp-row"><span class="bp-dot" style="background:${this.colors[i%8]}"></span>
                <label>${opt}</label>
                <span class="bp-data">(${s.votes[i]}명)</span>
                <input type="number" min="0" max="100" step="0.1" value="0" class="bp-inp" data-i="${i}"> %</div>`;
        });
        h += '</div><div class="bp-total">합계: <strong id="bp-sum">0</strong>%</div>';
        h += `<div class="bp-preview" id="bp-preview"></div>`;
        c.innerHTML = h;

        const self = this;
        c.querySelectorAll('.bp-inp').forEach(inp => {
            inp.addEventListener('input', () => {
                const i = +inp.dataset.i;
                self.values[i] = parseFloat(inp.value) || 0;
                const sum = self.values.reduce((a,b)=>a+b,0);
                document.querySelector('#bp-sum').textContent = sum.toFixed(1);
                document.querySelector('#bp-sum').style.color = Math.abs(sum-100)<0.5 ? '#00B894' : '#E17055';
                self.updatePercentPreview(type);
            });
        });
    },

    updatePercentPreview(type) {
        const p = document.querySelector('#bp-preview');
        const sum = this.values.reduce((a,b)=>a+b,0);
        if (sum <= 0) { p.innerHTML = ''; return; }
        if (type === 'band') {
            let h = '<div class="bp-band">';
            this.survey.options.forEach((opt, i) => {
                const w = this.values[i]/sum*100;
                if (w > 0) h += `<div class="bp-seg" style="width:${w}%;background:${this.colors[i%8]}">${w>=8?this.values[i].toFixed(1)+'%':''}</div>`;
            });
            h += '</div>';
            p.innerHTML = h;
        } else {
            let grad = '', acc = 0;
            this.survey.options.forEach((opt, i) => {
                const pct = this.values[i]/sum*100;
                grad += `${this.colors[i%8]} ${acc}% ${acc+pct}%,`;
                acc += pct;
            });
            p.innerHTML = `<div class="bp-pie" style="background:conic-gradient(${grad.slice(0,-1)})"></div>`;
        }
    },

    /* ===== LINE CHART BUILDER ===== */
    buildLine(c) {
        const s = this.survey;
        let h = '<div class="bb-hint">📌 각 항목 위치에서 알맞은 높이를 클릭하여 점을 찍으세요!</div>';

        // Settings for axis
        h += '<div class="bb-axis-settings">';
        h += '<label>가로축: <input type="text" class="bb-axis-inp" id="x-axis-name" placeholder="예: 항목" value="항목"></label>';
        h += '<label>세로축: <input type="text" class="bb-axis-inp" id="y-axis-name" placeholder="예: 학생 수" value="학생 수"></label>';
        h += '<label>단위: <input type="text" class="bb-axis-inp" id="y-axis-unit" placeholder="예: 명" value="명"></label>';
        h += '<label>눈금 1칸 = <select class="bb-axis-inp" id="y-axis-step">';
        [1,2,5,10].forEach(n => h += `<option value="${n}">${n}</option>`);
        h += '</select></label>';
        h += '</div>';

        h += '<div class="bb-graph-area" style="position:relative; margin-top:25px;">';
        h += '<div class="bb-y-label-area" style="position:absolute; top:-25px; left:-10px; font-size:12px; font-weight:600; color:var(--text-secondary);">';
        h += '<span id="disp-y-title">학생 수</span> (<span id="disp-y-unit">명</span>)';
        h += '</div>';

        h += '<div id="line-grid-container"></div>';

        h += '<div class="bb-x-label-area" style="text-align:right; font-size:12px; font-weight:600; color:var(--text-secondary); margin-top:5px; padding-right:10px;">';
        h += '<span id="disp-x-title">항목</span>';
        h += '</div>';

        h += '</div>'; // bb-graph-area 닫기
        c.innerHTML = h;

        const self = this;
        // event listeners for settings
        const updateAxisText = () => {
            const yUnit = c.querySelector('#y-axis-unit').value || '';
            c.querySelector('#disp-x-title').textContent = c.querySelector('#x-axis-name').value || '';
            c.querySelector('#disp-y-title').textContent = c.querySelector('#y-axis-name').value || '';
            c.querySelector('#disp-y-unit').textContent = yUnit;
            s.options.forEach((opt, i) => {
                const v = c.querySelector(`#bbv-${i}`);
                if (v) v.textContent = self.values[i] > 0 ? self.values[i] + yUnit : '0' + yUnit;
            });
        };
        c.querySelector('#x-axis-name').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-name').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-unit').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-step').addEventListener('change', () => {
            self.values = new Array(s.options.length).fill(0);
            self.renderLineGrid(c);
        });

        this.renderLineGrid(c);
    },

    renderLineGrid(c) {
        const s = this.survey;
        const container = c.querySelector('#line-grid-container');
        if (!container) return;

        const yStep = +(c.querySelector('#y-axis-step')?.value || 1);
        const rawMax = Math.max(...s.votes, 1);
        let maxYCells = Math.ceil(rawMax / yStep) + 2;
        if (maxYCells < 4) maxYCells = 4;
        if (maxYCells > 20) maxYCells = 20;
        const CELL_H = 28;

        let h = '<div class="bb-wrapper">';
        h += `<div class="bb-yaxis lc-yaxis" style="--cell-h:${CELL_H}px">`;
        for (let y = maxYCells; y >= 1; y--) {
            h += `<div class="bb-yl lc-yl" style="height:${CELL_H}px">${y * yStep}</div>`;
        }
        h += '<div class="bb-yl lc-yl lc-zero" style="height:12px">0</div>';
        h += '</div>';

        h += '<div class="bb-cols line-mode">';
        s.options.forEach((opt, i) => {
            h += `<div class="bb-col lc-col" data-idx="${i}" style="--cell-h:${CELL_H}px">`;
            for (let y = maxYCells; y >= 1; y--) {
                const val = y * yStep;
                h += `<div class="bb-cell lc" data-y="${val}" data-i="${i}" style="height:${CELL_H}px;min-height:unset" title="${val}명"></div>`;
            }
            h += '</div>';
        });
        h += '</div></div>';

        h += '<div class="lc-vals" style="padding-left:38px">';
        s.options.forEach((opt, i) => {
            h += `<div class="bb-val lc-val-cell" id="bbv-${i}">0명</div>`;
        });
        h += '</div>';

        h += '<div class="bb-labels" style="padding-left:38px">';
        s.options.forEach(o => h += `<div class="bb-lb">${o}</div>`);
        h += '</div>';

        h += '<svg id="line-svg" class="line-svg"></svg>';
        container.innerHTML = h;

        const self = this;
        c.querySelectorAll('.bb-cell.lc').forEach(cell => {
            cell.addEventListener('mouseenter', () => {
                const y = +cell.dataset.y;
                const yUnit = c.querySelector('#y-axis-unit').value || '';
                cell.title = `${y}${yUnit} 클릭하여 선택`;
            });
            cell.addEventListener('click', () => {
                const i = +cell.dataset.i, y = +cell.dataset.y;
                self.values[i] = (self.values[i] === y) ? 0 : y;
                // update visual
                c.querySelectorAll(`.bb-cell.lc[data-i="${i}"]`).forEach(cl => cl.classList.remove('dot'));
                if (self.values[i] > 0) cell.classList.add('dot');
                const valEl = c.querySelector(`#bbv-${i}`);
                const yUnit = c.querySelector('#y-axis-unit').value || '';
                if (valEl) valEl.textContent = self.values[i] > 0 ? self.values[i] + yUnit : '0' + yUnit;
                self.drawLines(c);
            });
        });

        // Restore visual state
        s.options.forEach((opt, i) => {
            const v = self.values[i];
            const cell = c.querySelector(`.bb-cell.lc[data-i="${i}"][data-y="${v}"]`);
            if (cell) cell.classList.add('dot');
            const valEl = c.querySelector(`#bbv-${i}`);
            const yUnit = c.querySelector('#y-axis-unit').value || '';
            if (valEl) valEl.textContent = v > 0 ? v + yUnit : '0' + yUnit;
        });
        self.drawLines(c);
    },

    drawLines(c) {
        const svg = c.querySelector('#line-svg');
        if (!svg) return;
        const wrapper = c.querySelector('.bb-wrapper');
        if (!wrapper) return;

        // SVG를 bb-wrapper 기준으로 위치
        const wr = wrapper.getBoundingClientRect();
        const cr = c.getBoundingClientRect();
        svg.style.left   = (wr.left - cr.left) + 'px';
        svg.style.top    = (wr.top  - cr.top)  + 'px';
        svg.style.width  = wr.width  + 'px';
        svg.style.height = wr.height + 'px';

        const cols = c.querySelectorAll('.lc-col');
        const pts = [];
        cols.forEach((col) => {
            const dot = col.querySelector('.bb-cell.dot');
            if (dot) {
                const r  = dot.getBoundingClientRect();
                const sr = wrapper.getBoundingClientRect();
                pts.push({ x: r.left + r.width/2  - sr.left,
                           y: r.top  + r.height/2 - sr.top });
            } else {
                pts.push(null);
            }
        });

        const valid = pts.filter(p => p);
        if (valid.length > 1) {
            const pointStr = valid.map(p => `${p.x},${p.y}`).join(' ');
            svg.innerHTML =
                `<polyline points="${pointStr}" fill="none" stroke="#6C5CE7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
                valid.map(p => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#6C5CE7" stroke="white" stroke-width="2"/>`).join('');
        } else {
            svg.innerHTML = '';
        }
    },


    /* ===== PICTOGRAPH BUILDER ===== */
    // 아이콘 카테고리 (주제에 맞는 그림 선택용)
    iconList: [
        {cat: '⭐ 기본', icons: ['⭐','❤️','⚽','🌸','💎','🔥','🎵','✨','🌟','🎯']},
        {cat: '🍎 과일', icons: ['🍎','🍊','🍋','🍇','🍓','🍑','🍌','🍉','🥝','🍒']},
        {cat: '🐶 동물', icons: ['🐶','🐱','🐰','🐻','🐼','🦁','🐯','🐸','🐥','🐟']},
        {cat: '⚽ 운동', icons: ['⚽','🏀','⚾','🎾','🏐','🏓','🏸','🎳','⛳','🥊']},
        {cat: '🌤️ 날씨', icons: ['☀️','🌧️','❄️','🌈','⛅','🌊','🌙','⭐','🌸','🍂']},
        {cat: '🍔 음식', icons: ['🍔','🍕','🍜','🍣','🍩','🍦','🌮','🍰','🍿','🥤']},
        {cat: '📚 학교', icons: ['📚','✏️','🎒','📐','🖍️','📖','🔬','🎨','📏','🖊️']},
        {cat: '🎮 취미', icons: ['🎮','📺','📱','🎧','📷','🎤','🎬','📕','🧩','🎲']},
        {cat: '🚗 탈것', icons: ['🚗','🚌','🚲','✈️','🚂','🚀','🛴','🚁','⛵','🏍️']},
    ],
    pictoIcon: '⭐',  // 전체 설문에 하나의 아이콘
    pictoBig: 10,
    pictoSmall: 1,

    buildPicto(c) {
        const s = this.survey;
        const maxV = Math.max(...s.votes, 1);
        this.pictoBig = maxV >= 20 ? 10 : maxV >= 10 ? 5 : maxV >= 5 ? 2 : 1;
        this.pictoSmall = 1;
        this.pictoIcon = '⭐';
        this.values = s.options.map(() => ({big:0, small:0}));

        let h = '<div class="bb-hint">📌 큰 그림과 작은 그림의 개수를 조절하여 데이터를 표현해 보세요!</div>';
        // 설정 영역
        h += '<div class="bp-picto-settings">';
        h += `<label>그림 선택:</label>`;
        h += `<button class="picto-current-icon" id="picto-icon-toggle" title="그림 변경">${this.pictoIcon}</button>`;
        h += '<label>큰 그림 =</label><select id="picto-big-sel">';
        [2,5,10,20].forEach(n => h += `<option value="${n}" ${n===this.pictoBig?'selected':''}>${n}명</option>`);
        h += '</select>';
        h += '<label>작은 그림 =</label><select id="picto-small-sel">';
        [1,2,5].forEach(n => h += `<option value="${n}" ${n===this.pictoSmall?'selected':''}>${n}명</option>`);
        h += '</select></div>';
        // 아이콘 선택 패널 (숨김)
        h += '<div id="picto-icon-panel" class="bp-icon-picker" style="display:none"><div class="bp-icon-grid">';
        this.iconList.forEach(group => {
            h += `<div class="bp-icon-cat">${group.cat}</div>`;
            group.icons.forEach(ic => {
                h += `<button class="bp-icon-opt${ic===this.pictoIcon?' active':''}" data-icon="${ic}">${ic}</button>`;
            });
        });
        h += '</div></div>';
        // 범례 + 행들
        h += '<div id="picto-rows" class="bp-picto-rows"></div>';
        c.innerHTML = h;
        this.renderPictoRows(c);

        const self = this;
        // 아이콘 선택 토글
        c.querySelector('#picto-icon-toggle').addEventListener('click', () => {
            const panel = c.querySelector('#picto-icon-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        // 아이콘 선택
        c.querySelectorAll('.bp-icon-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                self.pictoIcon = btn.dataset.icon;
                c.querySelector('#picto-icon-toggle').textContent = self.pictoIcon;
                c.querySelector('#picto-icon-panel').style.display = 'none';
                c.querySelectorAll('.bp-icon-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                self.renderPictoRows(c);
            });
        });
        // 큰/작은 그림 단위 변경
        c.querySelector('#picto-big-sel').addEventListener('change', e => {
            self.pictoBig = +e.target.value;
            self.values = s.options.map(() => ({big:0, small:0}));
            self.renderPictoRows(c);
        });
        c.querySelector('#picto-small-sel').addEventListener('change', e => {
            self.pictoSmall = +e.target.value;
            self.values = s.options.map(() => ({big:0, small:0}));
            self.renderPictoRows(c);
        });
    },

    renderPictoRows(c) {
        const s = this.survey;
        const rows = c.querySelector('#picto-rows');
        const icon = this.pictoIcon;
        // 범례: 하나의 아이콘으로 통일
        let h = `<div class="bp-picto-key"><span class="picto-big-icon">${icon}</span> = ${this.pictoBig}명 &nbsp;&nbsp; <span class="picto-sm-icon">${icon}</span> = ${this.pictoSmall}명</div>`;

        s.options.forEach((opt, i) => {
            const v = this.values[i];
            const total = v.big * this.pictoBig + v.small * this.pictoSmall;
            // 큰 아이콘 + 구분선 + 작은 아이콘
            let iconHtml = '';
            for (let j = 0; j < v.big; j++) iconHtml += `<span class="picto-big-icon">${icon}</span>`;
            if (v.big > 0 && v.small > 0) iconHtml += '<span class="picto-sep">│</span>';
            for (let j = 0; j < v.small; j++) iconHtml += `<span class="picto-sm-icon">${icon}</span>`;

            h += `<div class="bp-pr">
                <span class="bp-pr-label">${opt}</span>
                <div class="bp-pr-icons" id="picto-icons-${i}">${iconHtml || '<span class="picto-empty">—</span>'}</div>
                <div class="bp-pr-dual-btns">
                    <div class="bp-btn-group">
                        <span class="bp-btn-label">큰 그림</span>
                        <button class="btn-icon picto-big-minus" data-i="${i}">−</button>
                        <span class="bp-btn-val">${v.big}</span>
                        <button class="btn-icon picto-big-plus" data-i="${i}">+</button>
                    </div>
                    <div class="bp-btn-group">
                        <span class="bp-btn-label">작은 그림</span>
                        <button class="btn-icon picto-small-minus" data-i="${i}">−</button>
                        <span class="bp-btn-val">${v.small}</span>
                        <button class="btn-icon picto-small-plus" data-i="${i}">+</button>
                    </div>
                    <span class="bp-pr-count">${total}명</span>
                </div>
            </div>`;
        });
        rows.innerHTML = h;

        const self = this;
        rows.querySelectorAll('.picto-big-plus').forEach(btn => {
            btn.addEventListener('click', () => { self.values[+btn.dataset.i].big++; self.renderPictoRows(c); });
        });
        rows.querySelectorAll('.picto-big-minus').forEach(btn => {
            btn.addEventListener('click', () => { const i=+btn.dataset.i; if(self.values[i].big>0) self.values[i].big--; self.renderPictoRows(c); });
        });
        rows.querySelectorAll('.picto-small-plus').forEach(btn => {
            btn.addEventListener('click', () => { self.values[+btn.dataset.i].small++; self.renderPictoRows(c); });
        });
        rows.querySelectorAll('.picto-small-minus').forEach(btn => {
            btn.addEventListener('click', () => { const i=+btn.dataset.i; if(self.values[i].small>0) self.values[i].small--; self.renderPictoRows(c); });
        });
    },

    /* ===== CHECK ANSWER ===== */
    checkAnswer() {
        const s = this.survey;
        const fb = document.querySelector('#builder-feedback');
        const total = s.votes.reduce((a,b)=>a+b,0);
        let correct = 0, results = [];

        if (this.currentType === 'bar' || this.currentType === 'line') {
            const unitInp = document.querySelector('#y-axis-unit');
            const unit = unitInp ? unitInp.value : '명';
            s.options.forEach((opt, i) => {
                const ok = this.values[i] === s.votes[i];
                if (ok) correct++;
                results.push({label:opt, yours:this.values[i]+unit, answer:s.votes[i]+unit, ok});
            });
        } else if (this.currentType === 'pie' || this.currentType === 'band') {
            s.options.forEach((opt, i) => {
                const expected = total > 0 ? +(s.votes[i]/total*100).toFixed(1) : 0;
                const ok = Math.abs(this.values[i] - expected) < 1.5;
                if (ok) correct++;
                results.push({label:opt, yours:this.values[i]+'%', answer:expected+'%', ok});
            });
        } else if (this.currentType === 'pictograph') {
            s.options.forEach((opt, i) => {
                const v = this.values[i];
                const studentVal = v.big * this.pictoBig + v.small * this.pictoSmall;
                const ok = studentVal === s.votes[i];
                if (ok) correct++;
                const icon = this.pictoIcon;
                const desc = `${icon}×${v.big}(큰) + ${icon}×${v.small}(작은) = ${studentVal}명`;
                results.push({label:opt, yours:desc, answer:s.votes[i]+'명', ok});
            });
        }

        const pct = Math.round(correct/s.options.length*100);
        const emoji = pct === 100 ? '🎉' : pct >= 75 ? '👍' : pct >= 50 ? '💪' : '🤔';
        let h = `<div class="bf-score">${emoji} ${correct}/${s.options.length} 정답! (${pct}점)</div>`;
        h += '<table class="bf-table"><thead><tr><th></th><th>항목</th><th>내 답</th><th>정답</th></tr></thead><tbody>';
        results.forEach(r => {
            h += `<tr class="${r.ok?'bf-ok':'bf-wrong'}"><td>${r.ok?'✅':'❌'}</td><td>${r.label}</td><td>${r.yours}</td><td>${r.answer}</td></tr>`;
        });
        h += '</tbody></table>';
        if (pct === 100) h += '<div class="bf-perfect">🏆 완벽해요! 모두 맞혔습니다!</div>';
        else h += '<div class="bf-retry">틀린 부분을 수정하고 다시 확인해 보세요!</div>';
        fb.innerHTML = h;
        fb.scrollIntoView({behavior:'smooth'});
    }
};
