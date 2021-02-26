// 优化的IDW算法支持类库
// 作者：黎永基(liyj20@asiainfo.com)

'use strict'
import MatrixUtil from '@/idw/MatrixUtil.js'
var IdwMultiFrame;

(function (IdwMultiFrame) {
  class MultiFrame {
    constructor(maxVal, kernel, convKernelSize, opacity, grad) {
      this.maxVal = maxVal
      this.kernel = kernel
      this.convKernelSize = convKernelSize
      this.opacity = opacity
      this.grad = grad
    }

    restart(idw, nCellX, nCellY, scoreList) {
      console.log('frameRender, point counts: ' + scoreList.length + ' ,size: ' + nCellY + ' X ' + nCellX)
      this.nCellX = nCellX
      this.nCellY = nCellY
      this.idw = idw
      // clear queue data and cached nominator and denominator
      if (this.nominator) {
        this.nominator.clear()
        this.denominator.clear()
      } else {
        this.nominator = new MatrixUtil.PackedMatrix(nCellX, nCellY)
        this.denominator = new MatrixUtil.PackedMatrix(nCellX, nCellY)
      }
      this.queue = []
      // this.idw.clearCanvas()

      const batchSize = 128 * 3
      const len = scoreList.length
      let i = len % batchSize
      if (i > 0) {
        this.queue.push(scoreList.slice(0, i))
      }
      for (;i < len; i += batchSize) {
        let block = scoreList.slice(i, i + batchSize)
        this.queue.push(block)
      }

      const _this = this
      function frameRender(now) {
        if (!_this.queue) {
          return
        }
        const block = _this.queue.shift()
        if (!block) {
          console.log('frameRender stop: ' + now)
          return
        }
        console.time('frameRender')
        console.log('frameRender: ' + now + ', block size: ' + block.length)
        let result = MatrixUtil.convIDW(
          _this.nCellX,
          _this.nCellY,
          block,
          _this.maxVal,
          _this.kernel.linearData,
          _this.convKernelSize,
          _this.convKernelSize,
          _this.nominator.linearData,
          _this.denominator.linearData
        )
        // 渲染热力图
        _this.idw.data(result).draw(_this.opacity, _this.grad)
        console.timeEnd('frameRender')

        requestAnimationFrame(frameRender)
      }

      requestAnimationFrame(frameRender)
    }

    destroy() {
      this.kernel = null
      this.nominator = null
      this.denominator = null
      this.queue = null
      this.grad = null
    }
  }

  IdwMultiFrame.MultiFrame = MultiFrame
})(IdwMultiFrame || (IdwMultiFrame = {}))

export default IdwMultiFrame
