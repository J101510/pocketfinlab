(function () {
  function fmtWon(n) {
    return Math.round(n || 0).toLocaleString('ko-KR') + '원';
  }
  function fmtMan(n) {
    return Math.round(n || 0).toLocaleString('ko-KR') + '만 원';
  }
  function num(box, name) {
    var el = box.querySelector('[name="' + name + '"]');
    return el ? (parseFloat(el.value) || 0) : 0;
  }
  function str(box, name) {
    var el = box.querySelector('[name="' + name + '"]');
    return el ? el.value : '';
  }

  function calcGiftGross(taxBaseWon) {
    if (taxBaseWon <= 0) return 0;
    if (taxBaseWon <= 100000000) return taxBaseWon * 0.10;
    if (taxBaseWon <= 500000000) return taxBaseWon * 0.20 - 10000000;
    if (taxBaseWon <= 1000000000) return taxBaseWon * 0.30 - 60000000;
    if (taxBaseWon <= 3000000000) return taxBaseWon * 0.40 - 160000000;
    return taxBaseWon * 0.50 - 460000000;
  }

  function calcIncomeTax(taxBaseWon) {
    if (taxBaseWon <= 0) return 0;
    if (taxBaseWon <= 14000000) return taxBaseWon * 0.06;
    if (taxBaseWon <= 50000000) return taxBaseWon * 0.15 - 1260000;
    if (taxBaseWon <= 88000000) return taxBaseWon * 0.24 - 5760000;
    if (taxBaseWon <= 150000000) return taxBaseWon * 0.35 - 15440000;
    if (taxBaseWon <= 300000000) return taxBaseWon * 0.38 - 19940000;
    return taxBaseWon * 0.40 - 25940000;
  }

  var evaluators = {
    pension_isa: function (box) {
      var rate = parseFloat(str(box, 'bracket')) || 0.165;
      var pension = Math.max(0, num(box, 'pension'));
      var irp = Math.max(0, num(box, 'irp'));
      var isa = Math.max(0, num(box, 'isa'));
      var baseRec = Math.min(900, Math.min(600, pension) + irp);
      var isaExtra = Math.min(300, Math.floor(isa * 0.10));
      var totalBase = baseRec + isaExtra;
      var refund = totalBase * 10000 * rate;
      var freeOut = Math.max(0, (pension + irp + isa) - totalBase);
      return {
        primary: '예상 연말정산 세액공제 환급액: ' + fmtWon(refund),
        items: [
          '기본 공제 인정: ' + fmtMan(baseRec) + ' (한도 900만)',
          'ISA 전환 추가 인정: ' + fmtMan(isaExtra) + ' (한도 300만)',
          '비과세 자유인출 가능 원금: ' + fmtMan(freeOut)
        ]
      };
    },
    gift_tax: function (box) {
      var relLimit = parseFloat(str(box, 'relation')) || 5000;
      var marExtra = (relLimit === 5000) ? (parseFloat(str(box, 'marriage')) || 0) : 0;
      var totalLimit = relLimit + marExtra;
      var cur = Math.max(0, num(box, 'current_gift'));
      var prior = Math.max(0, num(box, 'prior_gift'));
      var cumBase = Math.max(0, (cur + prior - totalLimit) * 10000);
      var priorBase = Math.max(0, (prior - totalLimit) * 10000);
      var grossDiff = Math.max(0, calcGiftGross(cumBase) - calcGiftGross(priorBase));
      var finalTax = grossDiff * 0.97;
      return {
        primary: '3개월 내 자진신고 시 최종 납부 증여세: ' + fmtWon(finalTax),
        items: [
          '적용 공제 한도: ' + fmtMan(totalLimit),
          '이번 과세표준: ' + fmtWon(Math.max(0, cumBase - priorBase)),
          '신고세액공제(3% 할인): -' + fmtWon(grossDiff * 0.03)
        ]
      };
    },
    freelancer_tax: function (box) {
      var grossWon = Math.max(0, num(box, 'gross')) * 10000;
      var expRate = parseFloat(str(box, 'exp_rate')) || 0.641;
      var deductWon = Math.max(0, num(box, 'deduct')) * 10000;
      var withheld = grossWon * 0.033;
      var incomeAmt = grossWon * (1 - expRate);
      var taxBase = Math.max(0, incomeAmt - deductWon);
      var natTax = Math.max(0, calcIncomeTax(taxBase) - 70000);
      var totalDecided = natTax * 1.10;
      var diff = withheld - totalDecided;
      var headline = diff >= 0
        ? '5월 종합소득세 예상 환급액: +' + fmtWon(diff)
        : '5월 종합소득세 예상 추가 납부액: ' + fmtWon(-diff);
      return {
        primary: headline,
        items: [
          '기납부 원천징수세액(3.3%): ' + fmtWon(withheld),
          '경비 차감 후 소득금액: ' + fmtWon(incomeAmt),
          '최종 결정세액(지방세 포함): ' + fmtWon(totalDecided)
        ]
      };
    },
    tax_refund: function (box) {
      var tp = str(box, 'refund_type');
      var amtWon = Math.max(0, num(box, 'base_amt')) * 10000;
      var yrs = Math.max(1, parseInt(str(box, 'years'), 10) || 1);
      var annualNat = 0;
      var label = '';
      if (tp === 'sme90') {
        annualNat = Math.min(2000000, amtWon * 0.90);
        label = '중소기업 청년 90% 감면 (연 200만 한도)';
      } else if (tp === 'sme70') {
        annualNat = Math.min(2000000, amtWon * 0.70);
        label = '중소기업 70% 감면 (연 200만 한도)';
      } else if (tp === 'rent17') {
        annualNat = Math.min(10000000, amtWon) * 0.17;
        label = '월세 세액공제 17% (연 1,000만 한도)';
      } else {
        annualNat = Math.min(10000000, amtWon) * 0.15;
        label = '월세 세액공제 15% (연 1,000만 한도)';
      }
      var annualWithLocal = annualNat * 1.10;
      var totalRefund = annualWithLocal * yrs;
      return {
        primary: yrs + '년 치 경정청구 예상 총 환급액: ' + fmtWon(totalRefund),
        items: [
          '적용 기준: ' + label,
          '1년당 국세 환급: ' + fmtWon(annualNat),
          '1년당 지방소득세(10%) 환급: ' + fmtWon(annualNat * 0.10)
        ]
      };
    },
    housing_loan: function (box) {
      var rawCap = parseInt(str(box, 'loan_type'), 10) || 24000;
      var isJeonse = (rawCap === 20001);
      var capMan = isJeonse ? 20000 : rawCap;
      var reqMan = Math.max(0, num(box, 'principal'));
      var appliedMan = Math.min(capMan, reqMan);
      var P = appliedMan * 10000;
      var annualRate = Math.max(0.1, num(box, 'rate')) / 100;
      var r = annualRate / 12;
      var n = isJeonse ? 0 : (parseInt(str(box, 'term'), 10) || 0);
      var monthly = 0;
      if (n === 0) {
        monthly = P * r;
      } else {
        monthly = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      }
      var capNote = reqMan > capMan ? ' (유형 상한 ' + fmtMan(capMan) + ' 캡 적용)' : ' (한도 이내)';
      return {
        primary: '예상 월 납입 원리금(이자): ' + fmtWon(monthly),
        items: [
          '적용 대출 원금: ' + fmtMan(appliedMan) + capNote,
          '첫 달 이자 상당액: ' + fmtWon(P * r),
          '연간 상환 총액: ' + fmtWon(monthly * 12)
        ]
      };
    },
    transport_kpass: function (box) {
      var ut = str(box, 'user_type');
      var rides = Math.max(0, num(box, 'rides'));
      var fare = Math.max(0, num(box, 'fare'));
      var wide = str(box, 'wide') === 'yes';
      var gross = rides * fare;
      var kRate = ut === 'youth' ? 0.30 : (ut === 'lowinc' ? 0.533 : 0.20);
      var kRefund = rides >= 15 ? gross * kRate : 0;
      var kNet = gross - kRefund;
      var climateCost = (ut === 'youth' || ut === 'seoul3539') ? 55000 : 62000;
      var headline = '';
      if (wide) {
        headline = '추천: K-패스 유리 (월 실부담 ' + fmtWon(kNet) + ' · 광역/GTX 호환)';
      } else if (kNet <= climateCost) {
        headline = '추천: K-패스가 월 ' + fmtWon(climateCost - kNet) + ' 더 저렴합니다!';
      } else {
        headline = '추천: 기후동행카드가 월 ' + fmtWon(kNet - climateCost) + ' 더 저렴합니다!';
      }
      return {
        primary: headline,
        items: [
          '월 교통비 원금: ' + fmtWon(gross),
          'K-패스 환급 후 실부담: ' + fmtWon(kNet) + ' (환급 -' + fmtWon(kRefund) + ')',
          wide ? '기후동행카드: 광역·신분당·GTX 미지원 구간 주의' : '기후동행카드 30일권: ' + fmtWon(climateCost)
        ]
      };
    },
    savings_interest: function (box) {
      var mode = str(box, 'mode');
      var amtWon = Math.max(0, num(box, 'amount')) * 10000;
      var rate = Math.max(0, num(box, 'rate')) / 100;
      var months = Math.max(1, Math.round(num(box, 'months')));
      var taxRate = parseFloat(str(box, 'tax_mode'));
      if (isNaN(taxRate)) taxRate = 0.154;
      var principal = 0;
      var grossInt = 0;
      if (mode === 'lump') {
        principal = amtWon;
        grossInt = principal * rate * (months / 12);
      } else {
        principal = amtWon * months;
        grossInt = amtWon * (months * (months + 1) / 2) * (rate / 12);
      }
      var tax = grossInt * taxRate;
      var netInt = grossInt - tax;
      return {
        primary: '만기 세후 실수령액: ' + fmtWon(principal + netInt) + ' (세후 이자 +' + fmtWon(netInt) + ')',
        items: [
          '원금 합계: ' + fmtWon(principal),
          '세전 이자: ' + fmtWon(grossInt),
          '이자 과세 차감: -' + fmtWon(tax)
        ]
      };
    },
    year_end_tax: function (el) {
      var salary = num(el, 'salary') * 10000;
      var credit = num(el, 'credit') * 10000;
      var debit = num(el, 'debit') * 10000;
      var market = num(el, 'market') * 10000;
      var minSpend = salary * 0.25;
      var rem = minSpend;
      var cUse = Math.min(credit, rem); rem -= cUse;
      var dUse = Math.min(debit, rem); rem -= dUse;
      var mUse = Math.min(market, rem); rem -= mUse;
      var cEx = Math.max(0, credit - cUse);
      var dEx = Math.max(0, debit - dUse);
      var mEx = Math.max(0, market - mUse);
      var basicCap = salary <= 70000000 ? 3000000 : 2500000;
      var rawBasic = cEx * 0.15 + dEx * 0.30;
      var basicDed = Math.min(basicCap, rawBasic);
      var overflow = Math.max(0, rawBasic - basicCap);
      var extraDed = Math.min(3000000, mEx * 0.40 + Math.min(overflow, mEx * 0.40));
      var totalDed = basicDed + extraDed;
      var taxRate = salary <= 30000000 ? 0.066 : (salary <= 74000000 ? 0.165 : (salary <= 120000000 ? 0.264 : 0.385));
      var estRefund = totalDed * taxRate;
      var totalSpent = credit + debit + market;
      if (totalSpent <= minSpend) {
        return {
          primary: '카드 소득공제: 0원 (25% 문턱까지 ' + fmtWon(minSpend - totalSpent) + ' 부족)',
          items: [
            '총급여 25% 최저사용기준: ' + fmtWon(minSpend),
            '현재 합산 사용액: ' + fmtWon(totalSpent),
            '전략: 문턱 이하 구간은 혜택 좋은 신용카드 사용 유리'
          ]
        };
      }
      return {
        primary: '예상 절세(환급) 효과: 약 ' + fmtWon(estRefund) + ' (총 소득공제 ' + fmtWon(totalDed) + ')',
        items: [
          '25% 문턱(' + fmtWon(minSpend) + ') 초과분 공제 반영',
          '기본한도 공제: ' + fmtWon(basicDed) + ' / ' + fmtWon(basicCap),
          '전통시장·교통 추가공제: ' + fmtWon(extraDed) + ' · 적용 한계세율 ' + (taxRate * 100).toFixed(1) + '%'
        ]
      };
    },
    nhis_premium: function (el) {
      var inc = num(el, 'income') * 10000;
      var prop = num(el, 'prop_taxbase') * 10000;
      var bizEl = el.querySelector('[name="biz_status"]');
      var biz = bizEl ? bizEl.value : 'none';
      var depOk = (inc <= 20000000) && (prop <= 540000000 || (prop <= 900000000 && inc <= 10000000)) && (biz !== 'biz_taxable');
      var incPrem = inc <= 3360000 ? 19780 : (inc / 12) * 0.0709;
      var netProp = Math.max(0, prop - 100000000);
      var propPrem = 0;
      if (netProp > 0) {
        var units = Math.pow(netProp / 1000000, 0.62) * 28;
        propPrem = units * 208.4;
      }
      var health = Math.round(incPrem + propPrem);
      var care = Math.round(health * 0.1295);
      var totalMonthly = health + care;
      var verdict = depOk ? '피부양자 자격 유지 가능 (본인 건보료 0원)' : '지역가입자 전환 대상 · 월 예상 ' + fmtWon(totalMonthly);
      return {
        primary: verdict,
        items: [
          '지역 전환 시 월 합계(장기요양 포함): 약 ' + fmtWon(totalMonthly),
          '소득분 건보료: ' + fmtWon(health - propPrem) + ' · 재산분(1억 공제 후): ' + fmtWon(propPrem),
          '자동차 건보료: 0원 (폐지 반영)'
        ]
      };
    }
  };

  function updateBox(box) {
    var cid = box.getAttribute('data-calc');
    var fn = evaluators[cid];
    if (!fn) return;
    var res = fn(box);
    var pEl = box.querySelector('.calc-primary');
    var bEl = box.querySelector('.calc-breakdown');
    if (pEl) pEl.textContent = res.primary;
    if (bEl) {
      bEl.innerHTML = '';
      res.items.forEach(function (txt) {
        var span = document.createElement('span');
        span.textContent = '• ' + txt;
        bEl.appendChild(span);
      });
    }
  }

  function initCalculators() {
    var boxes = document.querySelectorAll('.calc-box[data-calc]');
    boxes.forEach(function (box) {
      box.addEventListener('input', function () { updateBox(box); });
      box.addEventListener('change', function () { updateBox(box); });
      updateBox(box);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalculators);
  } else {
    initCalculators();
  }
})();