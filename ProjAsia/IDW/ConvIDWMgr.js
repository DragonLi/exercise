// 优化的IDW算法支持类库
// 作者：黎永基(liyj20@asiainfo.com)
// 已知问题/Known Issues
// 使用canvas渲染后无法叠加在leaflet的canvas上，导致需要重复读取数据渲染
// 可进一步执行的优化
// 为GPU准备的数据可以按照行列做成不定长二维数组，可以快速跳过卷积矩阵外的评分点

'use strict'
import MatrixUtil from '@/idw/MatrixUtil.js'
import IdwMultiFrame from '@/idw/idwMultiFrame.js'
import WebGLAcc from '@/idw/idwWebGL1Acc.js'
var ConvolutionIDW;

(function (ConvolutionIDW) {
  class Mgr {
    constructor(convKernelSize, idwExp, opacity, maxVal, gradOption) {
      this.convKernelSize = convKernelSize
      this.idwExp = idwExp / 2
      this.opacity = opacity
      this.maxVal = maxVal
      const half = Math.floor(convKernelSize / 2)
      this.maxDistance2 = half * half
      const testIE = this.browserVerTag = this.IEVersion()
      this.isIE11 = this.browserVerTag === 11
      const allowIE = window.Hosts.gis.enableIE === true ? true : testIE === -1 // avoid GPU inside IE!
      console.log('test IE version: ' + testIE + ' ,allowIE: ' + allowIE)

      this.createGradient(gradOption)

      if (allowIE && window.Hosts.gis.enableDirectWebGL) {
        this.directWebGL = new WebGLAcc.ConvIDW(testIE, this.maxDistance2, this.idwExp, opacity, maxVal, this.grad)
        if (this.directWebGL.isUsable()) {
          console.log('ConvIDW use direct WebGL')
          return
        }
        this.directWebGL.destroy()
        this.directWebGL = null
        console.log('direct WebGL creation failed')
      }

      this.kernel = new MatrixUtil.PackedMatrix(convKernelSize, convKernelSize)
      this.kernel.PrepareKernel(idwExp)
      if (window.Hosts.gis.enableMultiFrame && testIE !== -1) {
        this.idworker = new IdwMultiFrame.MultiFrame(this.maxVal, this.kernel, this.convKernelSize, this.opacity, this.grad)
        console.log('IE系浏览器使用分帧渲染技术')
      } else {
        console.log('不使用分帧渲染技术')
      }
    }

    createGradient(gradOption) {
      // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
      var canvas = document.createElement('canvas')
      var ctx = canvas.getContext('2d')
      var gradient = ctx.createLinearGradient(0, 0, 0, 256)
      canvas.width = 1
      canvas.height = 256
      for (var i in gradOption) {
        gradient.addColorStop(+i, gradOption[i])
      }
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 1, 256)
      this.grad = ctx.getImageData(0, 0, 1, 256).data
    }

    IEVersion() {
      const userAgent = navigator.userAgent // 取得浏览器的userAgent字符串
      const isIE = userAgent.indexOf('compatible') > -1 && userAgent.indexOf('MSIE') > -1 // 判断是否IE<11浏览器
      const isEdge = userAgent.indexOf('Edge') > -1 && !isIE // 判断是否IE的Edge浏览器
      const isIE11 = userAgent.indexOf('Trident') > -1 && userAgent.indexOf('rv:11.0') > -1
      if (isIE) {
        const fIEVersion = parseFloat(RegExp['$1'])
        if (fIEVersion === 7) {
          return 7
        } else if (fIEVersion === 8) {
          return 8
        } else if (fIEVersion === 9) {
          return 9
        } else if (fIEVersion === 10) {
          return 10
        } else {
          return 6// IE版本<=7
        }
      } else if (isEdge) {
        return 'edge'// edge
      } else if (isIE11) {
        return 11 // IE11
      } else {
        return -1// 不是ie浏览器
      }
    }

    destroy() {
      if (this.directWebGL) {
        this.directWebGL.destroy()
        this.directWebGL = null
      }
      if (this.kernel) {
        this.kernel = null
      }
      if (this.idworker) {
        this.idworker.destroy()
        this.idworker = null
      }
      if (this.grad) {
        this.grad = null
      }
      if (this.cachedPointArray) {
        this.cachedPointArray = null
      }
    }

    preAllocOutputTex(nCellX, nCellY) {
      if (this.directWebGL) {
        this.directWebGL.preAllocOutputTex(nCellX, nCellY)
      }
    }

    render(latlngs, nCellX, nCellY, idw, aimap) {
      if (!idw || !aimap || !latlngs) {
        console.log('idw rendering early exist!')
        return
      }
      if (window.Hosts.gis.debugGPU) {
        console.trace()
      }
      if (this.directWebGL) {
        console.time('direct webgl rendering')
        this.directWebGLRendering(latlngs, nCellX, nCellY, idw, aimap)
        console.timeEnd('direct webgl rendering')
      } else if (this.idworker) {
        this.asyncWorkerRendering(latlngs, nCellX, nCellY, idw, aimap)
      } else {
        this.uiThreadRendering(latlngs, nCellX, nCellY, idw, aimap)
      }
    }

    directWebGLRendering(latlngs, nCellX, nCellY, idw, aimap) {
      const {dat: scoreList, datCount} = this.organizeDataForGPU(latlngs, nCellX, nCellY, aimap)
      if (datCount === 0) {
        console.log('no point inside screen')
        idw.clearCanvas()
        return
      }
      console.log('direct rendering, point counts: ' + datCount + ' ,size: ' + nCellY + ' X ' + nCellX)
      try {
        // TODO direct rendering with canvas failed: color is not right
        // this.directWebGL.drawCall(scoreList, nCellX, nCellY)
        // idw._ctx.drawImage(this.directWebGL.canvas, 0, 0)
        const gpuPixels = this.directWebGL.drawCall(scoreList, nCellX, nCellY, datCount)
        idw.drawGpuPixels(gpuPixels)
      } catch (gpuErr) {
        this.directWebGL.destroy()
        this.directWebGL = null
        this.fallback(gpuErr, latlngs, nCellX, nCellY, idw, aimap)
      }
    }

    fallback(gpuErr, latlngs, nCellX, nCellY, idw, aimap) {
      console.log('gpu program throw exception\n' + gpuErr)
      if (!this.kernel) {
        this.kernel = new MatrixUtil.PackedMatrix(this.convKernelSize, this.convKernelSize)
        this.kernel.PrepareKernel(this.idwExp * 2)
      }

      if (window.Hosts.gis.enableMultiFrame && this.browserVerTag !== -1) {
        this.idworker = new IdwMultiFrame.MultiFrame(this.maxVal, this.kernel, this.convKernelSize, this.opacity)
        console.log('IE系浏览器使用分帧渲染技术')
        this.asyncWorkerRendering(latlngs, nCellX, nCellY, idw, aimap)
      } else {
        console.log('不使用分帧渲染技术')
        this.uiThreadRendering(latlngs, nCellX, nCellY, idw, aimap)
      }
    }

    organizeDataForGPU(heatDataList, nCellX, nCellY, aimap) {
      const len = heatDataList.length
      const pointArrLen = len * 3
      if (!(this.cachedPointArray && this.cachedPointArray.length >= pointArrLen)) {
        this.cachedPointArray = new Uint16Array(pointArrLen)
      }
      const heatDataArray = this.cachedPointArray
      const kSize = this.convKernelSize
      const maxX = nCellY + kSize
      const maxY = nCellX + kSize
      let c = 0
      for (let index = 0; index < len; index++) {
        const element = heatDataList[index]
        const value = element.score
        const heatData = [ element.latWgs84, element.lngWgs84, value ]
        const p = aimap.latLngToContainerPoint(heatData)
        const x = Math.ceil(p.x)
        const y = Math.ceil(p.y)
        if (x < -kSize || x >= maxX || y < -kSize || y >= maxY) {
          continue
        }
        heatDataArray[c] = x
        // 因为OpenGL的坐标原点在左下角，而canvas的坐标原点在左上角，通过后续调用getpixels(true)可以保持不会被反转
        heatDataArray[c + 1] = y
        heatDataArray[c + 2] = value
        c += 3
      }
      return {dat: heatDataArray, datCount: c}
    }

    organizeHeatData(heatDataList, nCellX, nCellY, aimap) {
      const len = heatDataList.length
      const pointArrLen = len * 3
      if (!(this.cachedPointArray && this.cachedPointArray.length >= pointArrLen)) {
        this.cachedPointArray = new Uint16Array(pointArrLen)
      }
      const heatDataArray = this.cachedPointArray
      const maxX = nCellY + this.convKernelSize
      const maxY = nCellX + this.convKernelSize
      let c = 0
      for (let index = 0; index < len; index++) {
        const element = heatDataList[index]
        const value = element.score
        const heatData = [ element.latWgs84, element.lngWgs84, value ]
        let p = aimap.latLngToContainerPoint(heatData)
        let x = Math.ceil(p.x)
        let y = Math.ceil(p.y)
        if (x < 0 || y < 0 || x >= maxX || y >= maxY) {
          continue
        }
        // 警告: 为了迁就canvas的imageData排版，对掉x和y的值
        heatDataArray[c] = y
        heatDataArray[c + 1] = x
        heatDataArray[c + 2] = value
        c += 3
      }
      return heatDataArray.subarray(0, c)
    }

    asyncWorkerRendering(latlngs, nCellX, nCellY, idw, aimap) {
      const scoreList = this.organizeHeatData(latlngs, nCellX, nCellY, aimap)
      if (scoreList.length === 0) {
        console.log('no point inside screen')
        idw.clearCanvas()
        return
      }
      this.idworker.restart(idw, nCellX, nCellY, scoreList)
    }

    uiThreadRendering(latlngs, nCellX, nCellY, idw, aimap) {
      console.time('uiThreadRendering')
      const scoreList = this.organizeHeatData(latlngs, nCellX, nCellY, aimap)
      if (scoreList.length === 0) {
        console.log('no point inside screen')
        idw.clearCanvas()
        console.timeEnd('uiThreadRendering')
        return
      }
      console.log('uiThreadRendering, point counts: ' + scoreList.length + ' ,size: ' + nCellY + ' X ' + nCellX)
      let result = MatrixUtil.convIDW(
        nCellX,
        nCellY,
        scoreList,
        this.maxVal,
        this.kernel.linearData,
        this.convKernelSize,
        this.convKernelSize
      )
      // 渲染热力图
      idw.data(result).draw(this.opacity, this.grad)
      console.timeEnd('uiThreadRendering')
    }
  }
  ConvolutionIDW.Mgr = Mgr
})(ConvolutionIDW || (ConvolutionIDW = {}))

export default ConvolutionIDW
