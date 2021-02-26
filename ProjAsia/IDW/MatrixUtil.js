// 优化的IDW算法支持类库
// 作者：黎永基(liyj20@asiainfo.com)
'use strict'

var MatrixUtil;

(function (MatrixUtil) {
  class PackedMatrix {
    constructor(rowCount, columnCount, linearDataArr) {
      this.rowCount = rowCount
      this.columnCount = columnCount
      this.linearData = linearDataArr || new Float32Array((this.rowCount * this.columnCount))
    }

    static RangeCheck(val, maxExclusive) {
      if (((val < 0) || (val >= maxExclusive))) {
        // throw new Error('out of range')
        return false
      }
      return true
    }

    static GetRange(center, len, max) {
      let half = Math.floor(len / 2)
      let otherStart = (center - half)
      let otherEnd = (otherStart + len)
      let start = otherStart < 0 ? 0 : otherStart
      otherStart = (start - otherStart)
      let end = otherEnd > max ? max : otherEnd

      return [start, end, otherStart]
    }

    GetMaxDistance2() {
      let half = Math.floor(Math.min(this.columnCount, this.rowCount) / 2)
      return half * half
    }

    PrepareKernel(power) {
      power = power / 2
      let half = Math.floor(Math.min(this.columnCount, this.rowCount) / 2)
      let maxDistance = half * half
      for (let i = 0, x = -half, xbase = 0; i < this.rowCount; i++, x++, xbase += this.columnCount) {
        let x2 = x * x
        for (let j = 0, y = -half; j < this.columnCount; j++, y++) {
          if (x === 0 && y === 0) {
            this.linearData[xbase + j] = 1
            continue
          }
          let d2 = x2 + y * y
          if (d2 > maxDistance) {
            continue
          }
          let t = Math.pow(d2, power)
          // test t == 0
          this.linearData[xbase + j] = 1 / t
        }
      }
    }

    MultiplyScalar(val) {
      let r = new PackedMatrix(this.rowCount, this.columnCount)
      for (let i = 0, len = this.linearData.length; (i < len); i++) {
        r.linearData[i] = (this.linearData[i] * val)
      }

      return r
    }

    clear() {
      this.linearData.fill(0)
    }

    Add(other) {
      if (((this.rowCount !== other.rowCount) ||
      (this.columnCount !== other.columnCount))) {
        throw new Error('size not match!')
      }
      for (let i = 0, len = this.linearData.length; (i < len); i++) {
        this.linearData[i] += other.linearData[i]
      }
    }

    PartialAdd(centerRow, centerCol, other) {
      if (!PackedMatrix.RangeCheck(centerRow, this.rowCount)) {
        return -1
      }

      if (!PackedMatrix.RangeCheck(centerCol, this.columnCount)) {
        return -1
      }

      let width = other.columnCount
      let height = other.rowCount
      let [startRow, lastRow, otherRowStart] = PackedMatrix.GetRange(centerRow, height, this.rowCount)
      let [startCol, lastCol, otherColStart] = PackedMatrix.GetRange(centerCol, width, this.columnCount)

      for (let i = startRow * this.columnCount + startCol, len = lastRow * this.columnCount + startCol, k = otherRowStart * width + otherColStart, delta = lastCol - startCol; i < len; i += this.columnCount, k += width) {
        for (let j = i, updateLen = i + delta, l = k; j < updateLen; ++j, ++l) {
          this.linearData[j] += other.linearData[l]
        }
      }
    }

    DivideBy(other) {
      if (((this.rowCount !== other.rowCount) ||
          (this.columnCount !== other.columnCount))) {
        throw new Error('size not match!')
      }

      let data = new Float32Array((this.rowCount * this.columnCount))
      for (let i = 0, len = this.linearData.length; i < len; i++) {
        data[i] = Math.abs(other.linearData[i]) < 1E-45 ? 0 : this.linearData[i] / other.linearData[i]
      }

      return new PackedMatrix(this.rowCount, this.columnCount, data)
    }

    Colorize(pixels, gradient, opacity) {
      for (let i = 0, c = 0, len = this.linearData.length; i < len; i++, c += 4) {
        let alpha = Math.ceil(this.linearData[i] * 255)
        alpha = alpha > 255 ? 255 * 4 : alpha * 4
        pixels.data[c] = gradient[alpha]
        pixels.data[c + 1] = gradient[alpha + 1]
        pixels.data[c + 2] = gradient[alpha + 2]
        pixels.data[c + 3] = opacity
      }
    }

    getValue(rowInd, colInd) {
      let value = this.linearData[rowInd * this.columnCount + colInd]
      return value
    }

    setValue(rowInd, colInd, value) {
      this.linearData[rowInd * this.columnCount + colInd] = value
    }
  }

  MatrixUtil.PackedMatrix = PackedMatrix

  function CIDW(nCellX, nCellY, scoreList, maxVal, kernelData, kernelRowCount, kernelColCount, nominatorData, denominatorData) {
    let kernel = new PackedMatrix(kernelRowCount, kernelColCount, kernelData)
    let nominatorAll = new PackedMatrix(nCellX, nCellY, nominatorData)
    let denominatorAll = new PackedMatrix(nCellX, nCellY, denominatorData)

    for (let index = 0, max = scoreList.length; index < max; index += 3) {
      let x = scoreList[index]
      let y = scoreList[index + 1]
      let value = scoreList[index + 2] / maxVal
      let nominator = kernel.MultiplyScalar(value)
      let denominator = kernel
      nominatorAll.PartialAdd(x, y, nominator)
      denominatorAll.PartialAdd(x, y, denominator)
    }

    return nominatorAll.DivideBy(denominatorAll)
  }
  MatrixUtil.convIDW = CIDW
})(MatrixUtil || (MatrixUtil = {}))

export default MatrixUtil
