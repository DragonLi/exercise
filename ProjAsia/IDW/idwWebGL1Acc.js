// 优化的IDW算法支持类库
// 作者：黎永基(liyj20@asiainfo.com)

'use strict'
var WebGLAcc;

(function (idwWebGLAcc) {
  class IDW {
    static TestRender() {
      const canvas = IDW.initCanvas()
      const settings = {
        alpha: true,
        depth: false,
        antialias: false
      }
      const gl = canvas.getContext('webgl', settings) || canvas.getContext('experimental-webgl', settings)
      const unmask = IDW.getUnmaskedInfo(gl)
      console.debug('WebGL unmarked vendor: ' + unmask.vendor)
      console.debug('WebGL unmarked renderer: ' + unmask.renderer)
    }

    static getUnmaskedInfo(gl) {
      const unMaskedInfo = {
        renderer: '',
        vendor: ''
      }

      const dbgRenderInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (dbgRenderInfo != null) {
        unMaskedInfo.renderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL)
        unMaskedInfo.vendor = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL)
      }

      return unMaskedInfo
    }

    constructor(browserVerTag, maxDistance2, idwExp, opacity, maxVal, grad) {
      console.debug('IDWebGLAcc started')
      this.browserVerTag = browserVerTag
      this.canvas = IDW.initCanvas()
      this.context = this.initContext()
      let gl = this.context
      if (!gl) {
        this.destroy()
        return
      }
      this.initShaderSrc(maxDistance2, idwExp, opacity, maxVal)
      if (window.Hosts.gis.debugGPU) {
        console.debug(this.compiledVertexShader)
        console.debug(this.compiledFragmentShader)
      }

      const vertShader = gl.createShader(gl.VERTEX_SHADER)
      gl.shaderSource(vertShader, this.compiledVertexShader)
      gl.compileShader(vertShader)
      if (window.Hosts.gis.debugGPU && !gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
        console.error('vertex shader error' + gl.getShaderInfoLog(vertShader))
      }

      const fragShader = gl.createShader(gl.FRAGMENT_SHADER)
      gl.shaderSource(fragShader, this.compiledFragmentShader)
      gl.compileShader(fragShader)
      if (window.Hosts.gis.debugGPU && !gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
        console.error('fragment shader error' + gl.getShaderInfoLog(fragShader))
      }

      const program = this.program = gl.createProgram()
      gl.attachShader(program, vertShader)
      gl.attachShader(program, fragShader)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        let errorLog = gl.getProgramInfoLog(program)
        gl.deleteProgram(program)
        this.program = null
        console.error('shader program link error: ' + errorLog)
      }

      gl.deleteShader(vertShader)
      gl.deleteShader(fragShader)
      this.compiledVertexShader = null
      this.compiledFragmentShader = null

      if (this.program) {
        this.initGradient(grad)
      } else {
        this.destroy()
      }
      console.debug('IDWebGLAcc finished init')
    }

    destroy() {
      if (this.context) {
        const gl = this.context
        if (this.program) {
          gl.deleteProgram(this.program)
          this.program = null
        }
        if (this.gradTexSlot) {
          gl.deleteTexture(this.gradTexSlot)
          this.gradTexSlot = null
        }
        if (this.scoreListTexSlot) {
          gl.deleteTexture(this.scoreListTexSlot)
          this.scoreListTexSlot = null
        }
        if (this.buffer) {
          gl.deleteBuffer(this.buffer)
          this.buffer = null
        }
        this.context = null
        this.canvas = null
        this.scoreListInternalBuf = null
        this.scoreListGPUBuf = null
        this.grad = null
        this.uOutputDim = null
        this.uTexSize = null
        this.scoreNum = null
        this.scoreListTexSize = null
        this.outputArr = null
        console.debug('WebGL resources have been released')
      }
    }

    isUsable() {
      return this.program !== null
    }

    initGradient(grad) {
      this.grad = grad
      const gl = this.context
      gl.useProgram(this.program)

      this.uploadGrad(gl)
      this.uploadVertexParams(gl)

      this.scoreListTexSlot = this.createTexSlot(gl, 1)
      const loc = gl.getUniformLocation(this.program, 'user_scoreList')
      gl.uniform1i(loc, 1)
      this.uOutputDim = gl.getUniformLocation(this.program, 'uOutputDim')
      this.uTexSize = gl.getUniformLocation(this.program, 'uTexSize')
      this.scoreNum = gl.getUniformLocation(this.program, 'user_scoreNum')
      this.scoreListTexSize = gl.getUniformLocation(this.program, 'user_scoreListSize')
    }

    preAllocOutputTex(nCellX, nCellY) {
      if (this.outputArr) {
        return
      }
      const outputLen = nCellY * nCellX * 4
      this.outputArr = new Uint8Array(outputLen)
      console.debug('directWebGL preAllocOutputTex ' + nCellX + ' X ' + nCellY)
    }

    drawCall(scoreList, nCellX, nCellY, datCount) {
      if (this.context) {
        const gl = this.context
        gl.useProgram(this.program)
        gl.enable(gl.SCISSOR_TEST)
        gl.scissor(0, 0, nCellY, nCellX)
        this.canvas.width = nCellY
        this.canvas.height = nCellX

        gl.uniform3iv(this.uOutputDim, [nCellY, nCellX, 1])
        gl.uniform2iv(this.uTexSize, [nCellY, nCellX])
        gl.uniform1i(this.scoreNum, datCount)

        const {width, height} = IDW.getTexSize(datCount)

        gl.uniform2iv(this.scoreListTexSize, [width, height])

        gl.activeTexture(gl.TEXTURE0 + 1)
        gl.bindTexture(gl.TEXTURE_2D, this.scoreListTexSlot)
        if (this.scoreListInternalBuf &&
          this.scoreListInternalBuf.length >= datCount) {
          this.scoreListInternalBuf.set(scoreList.slice(0, datCount))
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.scoreListGPUBuf)
        } else {
          const {preUploadValue, uploadValue} = this.uploadTexture(gl, scoreList, width, height, 2)
          this.scoreListInternalBuf = preUploadValue
          this.scoreListGPUBuf = uploadValue
        }

        gl.viewport(0, 0, nCellY, nCellX)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        const outputLen = nCellY * nCellX * 4
        let pixels
        if (this.outputArr && this.outputArr.length >= outputLen) {
          pixels = this.outputArr.slice(0, outputLen)
        } else {
          pixels = this.outputArr = new Uint8Array(outputLen)
        }
        gl.readPixels(0, 0, nCellY, nCellX, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        return pixels
      }
      return null
    }

    static getTexSize(len) {
      const totalArea = Math.floor((len + 4 - 1) / 4) * 4
      const length = totalArea / 2
      const sqrt = Math.sqrt(length)
      let high = Math.ceil(sqrt)
      let low = Math.floor(sqrt)
      while (high * low < length) {
        high--
        low = Math.ceil(length / high)
      }
      return {width: low, height: Math.ceil(length / low)}
    }

    uploadGrad(gl) {
      this.gradTexSlot = this.createTexSlot(gl, 0)
      this.uploadTexture(gl, this.grad, 16, 16, 1)
      const loc = gl.getUniformLocation(this.program, 'user_gradient')
      gl.uniform1i(loc, 0)
    }

    createTexSlot(gl, texIndex) {
      const tex = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + texIndex)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      return tex
    }

    /*
    getBitRatio(value) { ... }

    getTranserArrayType(value) { ... }
    */

    uploadTexture(gl, tex, width, height, bitRatio) {
      const len = width * height * (4 / bitRatio)
      const preUploadValue = tex.length >= len ? tex.slice(0, len) : new tex.constructor(len)
      const uploadValue = new Uint8Array(preUploadValue.buffer)
      if (tex.length < len) {
        preUploadValue.set(tex)
      }

      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, uploadValue)
      return {preUploadValue, uploadValue}
    }

    uploadVertexParams(gl) {
      const vertices = new Float32Array([-1, -1,
        1, -1, -1, 1,
        1, 1
      ])
      const texCoords = new Float32Array([
        0, 0,
        1, 0,
        0, 1,
        1, 1
      ])

      const buffer = this.buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength + texCoords.byteLength, gl.STATIC_DRAW)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices)
      gl.bufferSubData(gl.ARRAY_BUFFER, vertices.byteLength, texCoords)

      const aPosLoc = gl.getAttribLocation(this.program, 'aPos')
      gl.enableVertexAttribArray(aPosLoc)
      gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0)
      const aTexCoordLoc = gl.getAttribLocation(this.program, 'aTexCoord')
      gl.enableVertexAttribArray(aTexCoordLoc)
      gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, vertices.byteLength)

      const ratio = gl.getUniformLocation(this.program, 'ratio')
      gl.uniform2f(ratio, 1, 1)
    }

    static initCanvas() {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas')
        // Default width and height, to fix webgl issue in safari
        canvas.width = 2
        canvas.height = 2
        return canvas
      } else if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(0, 0)
      }
    }

    initContext() {
      const settings = {
        alpha: true,
        depth: false,
        antialias: false
      }
      const webgl2 = this.canvas.getContext('webgl2', settings)
      if (webgl2) {
        this.isWebGL2 = true
        console.debug('use webgl2')
        return webgl2
      }
      console.debug('try webgl1.0')
      this.isWebGL2 = false
      return this.canvas.getContext('webgl', settings) || this.canvas.getContext('experimental-webgl', settings)
    }

    convertFloatStr(val) {
      let ret = `${val}`
      if (ret.indexOf('.') === -1) {
        ret = ret + '.0'
      }
      return ret
    }

    initShaderSrc(maxDistance2, idwExp, opacity, maxVal) {
      const maxD2 = this.convertFloatStr(maxDistance2)
      const exp = this.convertFloatStr(idwExp)
      const opa = this.convertFloatStr(opacity)
      const maxV = this.convertFloatStr(maxVal)

      const shaderVersionTag = this.isWebGL2 ? '#version 300 es' : ''
      const vsParamAttriTag = this.isWebGL2 ? 'in' : 'attribute'
      const vsReturnValAttriTag = this.isWebGL2 ? 'out' : 'varying'
      const vs = `${shaderVersionTag}
precision lowp float;
precision lowp int;
precision lowp sampler2D;

${vsParamAttriTag} vec2 aPos;
${vsParamAttriTag} vec2 aTexCoord;

${vsReturnValAttriTag} vec2 vTexCoord;
uniform vec2 ratio;

void main(void) {
  gl_Position = vec4((aPos + vec2(1)) * ratio + vec2(-1), 0, 1);
  vTexCoord = aTexCoord;
}
`
      this.compiledVertexShader = vs

      const IE11fsKeyFunc = `
int calcPixelGradInd() {
  vec2 conv = vec2(0.0,0.0);
  vec2 tmp = vec2(0.0,0.0);
  vec2 cur = vec2(threadId.x,threadId.y);
  int user_c=0;
  int flag = 0;
  for (int user_i=0;user_i<MAX_LOOP;user_i+=3){
    if (user_i > user_scoreNum) {
      break;
    }
    if (flag == 0) {
      tmp = vec2(getScore(user_i), getScore(user_i+1)) - cur;
      float user_d2 = dot(tmp,tmp);
      if (!(user_d2 > constants_nearbyDistance)){
        user_c++;
        float user_val=float(getScore(user_i+2))/constants_maxVal;
        if (user_d2 < 1.0){
          flag = 1;
          conv = vec2(user_val, 1.0);
        }else {
          float user_t=pow(user_d2, constants_idwExp);
          conv += (vec2(user_val,1.0) / user_t);
        }
      }
    }
  }

  float user_alpha=(user_c>0)?(conv.x/conv.y):1.0;
  int user_d=(user_alpha>1.0)?(255*4):(int(floor(user_alpha*255.0))*4);
  return user_d;
}
`
      const keyFunc = `
int calcPixelGradInd() {
  vec2 conv = vec2(0.0,0.0);
  vec2 tmp = vec2(0.0,0.0);
  vec2 cur = vec2(threadId.x,threadId.y);
  int user_c=0;
  for (int user_i=0;user_i<MAX_LOOP;user_i+=3){
    if (user_i > user_scoreNum) {
      break;
    }
      tmp = vec2(getScore(user_i), getScore(user_i+1)) - cur;
      float user_d2 = dot(tmp,tmp);
      if (user_d2 > constants_nearbyDistance){
        continue;
      }
      user_c++;
      float user_val=float(getScore(user_i+2))/constants_maxVal;
      if (user_d2 < 1.0){
        conv = vec2(user_val, 1.0);
        break;
      }
      float user_t=pow(user_d2, constants_idwExp);
      conv += (vec2(user_val,1.0) / user_t);      
  }

  float user_alpha=(user_c>0)?(conv.x/conv.y):1.0;
  int user_d=(user_alpha>1.0)?(255*4):(int(floor(user_alpha*255.0))*4);
  return user_d;
}
`
      const fsKeyFunc = this.browserVerTag !== 11 ? keyFunc : IE11fsKeyFunc
      const fsSamplerPrecisionTag = this.isWebGL2 ? 'precision lowp sampler2DArray;' : ''
      const fsParamAttriTag = this.isWebGL2 ? 'in' : 'varying'
      const fsDecoding16CombineChannel = this.isWebGL2
        ? 'return texel[channel*2] * 255.0 + texel[channel*2 + 1] * 65280.0;'
        : `
  if (channel == 0) return texel.r * 255.0 + texel.g * 65280.0;
  if (channel == 1) return texel.b * 255.0 + texel.a * 65280.0;
  return 0.0;`
      const fsReturnValDecl = this.isWebGL2 ? 'out vec4 data0;' : ''
      const fsReturnStmt = this.isWebGL2 ? 'data0 = actualColor;' : 'gl_FragColor = actualColor;'
      const fsSampleTexFunc = this.isWebGL2 ? 'texture' : 'texture2D'
      const moduleOp = this.isWebGL2 ? 'index % 2' : 'index - ((index / 2) * 2)'
      const fs = `${shaderVersionTag}
precision lowp float;
precision lowp int;
precision lowp sampler2D;
${fsSamplerPrecisionTag}

uniform ivec3 uOutputDim;
uniform ivec2 uTexSize;

${fsParamAttriTag} vec2 vTexCoord;

float decode16(vec4 texel, int index) {
  int channel = ${moduleOp};
  ${fsDecoding16CombineChannel}
}

int index;
ivec3 threadId;

// idx = x + y * texDim.x + z * texDim.x * texDim.y
ivec3 indexTo3D(int idx, ivec3 texDim) {
  int tmp = texDim.x * texDim.y;
  int z = idx / tmp;
  idx -= z * tmp;
  int y = idx / texDim.x;
  int x = idx - y * texDim.x;
  return ivec3(x, y, z);
}

vec4 actualColor;

const float constants_nearbyDistance = ${maxD2};
const float constants_idwExp = ${exp};
const float constants_opacity = ${opa};
const float constants_maxVal = ${maxV};

uniform lowp sampler2D user_scoreList;
uniform lowp ivec2 user_scoreListSize;

uniform lowp sampler2D user_gradient;

int getScore(int index) {
  const int blockSize = 2;
  int w = user_scoreListSize.x * blockSize;
  int t = index / w;
  vec2 st = vec2((index-w*t), t) + 0.5;
  vec4 texel = ${fsSampleTexFunc}(user_scoreList, st / vec2(w, user_scoreListSize.y));
  return int(decode16(texel, index));
}
  
vec4 getGradient(int index) {
  const int w = 16 * 4;
  int t = index / w;
  vec2 st = vec2((index-w*t), t) + 0.5;
  vec4 texel = ${fsSampleTexFunc}(user_gradient, st / vec2(w, 16));
  return texel;
}

const int MAX_LOOP = 3000;
uniform int user_scoreNum;
${fsKeyFunc}

void kernel() {
  int user_d=calcPixelGradInd();
  vec4 gradColor = getGradient(user_d);
  actualColor = vec4(gradColor.rgb,constants_opacity);
}

${fsReturnValDecl}

void main(void) {
  index = int(vTexCoord.s * float(uTexSize.x)) + int(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;
  threadId = indexTo3D(index, uOutputDim);
  kernel();
  ${fsReturnStmt}
}
`
      this.compiledFragmentShader = fs
    }
  }

  idwWebGLAcc.ConvIDW = IDW
})(WebGLAcc || (WebGLAcc = {}))

export default WebGLAcc
