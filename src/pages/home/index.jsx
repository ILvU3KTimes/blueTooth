import Taro from '@tarojs/taro';
import React, { Component } from 'react';
import { View, Picker } from '@tarojs/components';
import { AtForm, AtInput, AtButton, AtMessage, AtList, AtListItem } from 'taro-ui';
import { string2buffer, ab2hex, isEmpty } from '../../utils/util';
import './index.scss';


class BlueTooth extends Component {

  state = {
    wifiName: '', // 当前手机连接的wifi信息
    wifiPassWord: '',
    logs: [],
    deviceArray: [],
    currDeviceID: '请选择...',
    btnType: 'blue', // 发送信息按钮类型
    debuggerValue: '', // debugger数值
  }

  componentDidMount() {
    const that = this;
    Taro.startWifi({
      success() {
        Taro.getConnectedWifi({
          success: resp => {
            console.log(resp);
            that.setState({
              wifiName: resp.wifi.SSID
            })
          },
          fail: resf => {
            if (resf.errCode == 12006) {
              Taro.showModal({
                title: '请打开GPS定位',
                content: 'Android手机不打开GPS定位，无法搜索到蓝牙设备.',
                showCancel: false
              })
            }
          }
        })
      }
    })
  }

  componentWillUnmount() { }

  componentDidShow() { }

  componentDidHide() { }

  delayTimer = ''; // 用来控制是否持续服务发现
  isFound = false; // 蓝牙是否被发现判断标识
  closeFlag = false; // 蓝牙适配器是否被关闭标识

  // 发送蓝牙信息
  sendBlueInfo = btnType => {
    const { currDeviceID, wifiName, wifiPassWord, debuggerValue } = this.state;
    console.log("选中:" + currDeviceID);
    if (isEmpty(currDeviceID) || currDeviceID == "请选择...") {
      Taro.atMessage({
        'message': '请先搜索设备',
        'type': 'warning',
      })
      return;
    }
    if (btnType === 'blue') { // 如果是发送蓝牙配网，需要判断是都有wifi信息
      if (isEmpty(wifiName)) {
        Taro.atMessage({
          'message': '请输入wifi名称',
          'type': 'warning',
        })
        return;
      }
      if (isEmpty(wifiPassWord)) {
        Taro.atMessage({
          'message': '请输入wifi密码',
          'type': 'warning',
        })
        return;
      }
    }
    if (btnType === 'debuggerValue') {
      if (isEmpty(debuggerValue)) {
        Taro.atMessage({
          'message': '请输入debugger数值',
          'type': 'warning',
        })
        return;
      }
    }
    const device = currDeviceID.split('[');
    if (device.length <= 1) {
      Taro.atMessage({
        'message': '当前没有蓝牙设备在线',
        'type': 'warning',
      })
      return;
    }
    const id = device[device.length - 1].replace("]", "");
    this.setState({
      btnType
    }, () => {
      this.createBLE(id);
    })
    
  }

  onReset = () => {
    this.initBLE();
  }

  initBLE = () => {
    this.printLog("启动蓝牙适配器, 蓝牙初始化")
    Taro.openBluetoothAdapter({
      success: () => {
        // console.log(res);
        this.findBLE();
      },
      fail: () => {
        Taro.atMessage({
          'message': '请先打开蓝牙',
          'type': 'warning',
        })
      }
    })
  }

  findBLE = () => {
    this.printLog("打开本机蓝牙成功.");
    Taro.startBluetoothDevicesDiscovery({
      // services: ['6E400001-B5A3-F393-E0A9-E50E24DCCA9E'], // uuid
      allowDuplicatesKey: false,
      interval: 0,
      success: () => {
        Taro.showLoading({
          title: '正在搜索设备',
        })
        this.delayTimer = setInterval(() => {
          this.discoveryBLE() //3.0 //这里的discovery需要多次调用
        }, 1000);
        setTimeout(() => {
          if (this.isFound) {
            return;
          } else {
            Taro.hideLoading();
            console.log("搜索设备超时");
            Taro.stopBluetoothDevicesDiscovery({
              success: () => {
                console.log('连接蓝牙成功之后关闭蓝牙搜索');
              }
            })
            clearInterval(this.delayTimer)
            Taro.showModal({
              title: '搜索设备超时',
              content: '请检查蓝牙设备是否正常工作，Android手机请打开GPS定位.',
              showCancel: false
            })
            Taro.atMessage({
              'message': '搜索设备超时，请打开GPS定位，再搜索',
              'type': 'warning',
            })
            return
          }
        }, 15000);
      },
      fail: res => {
        this.printLog("蓝牙设备服务发现失败: " + res.errMsg);
      }
    })
  }

  discoveryBLE = () => {
    Taro.getBluetoothDevices({
      success: res => {
        const list = res.devices;
        console.log('蓝牙列表', list);
        if (isEmpty(list)) {
          return;
        }
        const devices = [];
        list.forEach(v => {
          const name = v.name || v.localName;
          if (!isEmpty(name) && v.RSSI != 0) {
            // if (!isEmpty(name) && v.RSSI != 0) {
            // const item = {
            //   RSSI: v.RSSI,
            //   name: v.name,
            //   deviceId: v.deviceId,
            //   mac: Array.prototype.map.call(new Uint8Array(v.advertisData.slice(4, 10)), x => ('00' + x.toString(16)).slice(-2)).join(':').toUpperCase()
            // }
            // devices.push(item);
            devices.push(v);
          }
        })
        console.log('devices -----', devices);
        console.log('总共有' + devices.length + "个设备需要设置")
        if (devices.length <= 0) {
          return;
        }
        this.connectBLE(devices);
      },
      fail: function () {
        Taro.atMessage({
          'message': '搜索蓝牙设备失败',
          'type': 'warning',
        })
      }
    })
  }

  connectBLE = devices => {
    this.printLog('总共有' + devices.length + "个设备需要设置")
    Taro.hideLoading();
    this.isFound = true;
    clearInterval(this.delayTimer);
    Taro.stopBluetoothDevicesDiscovery({
      success: () => {
        this.printLog('连接蓝牙成功之后关闭蓝牙搜索');
      }
    })
    //两个的时候需要选择
    const list = [];
    devices.forEach(v => {
      const name = v.localName || v.name;
      list.push(name + "[" + v.deviceId + "]")
    })
    this.setState({
      deviceArray: list
    })
    //默认选择
    this.setState({
      currDeviceID: list[0]
    })
  }

  createBLE = deviceId => {
    this.printLog("连接: [" + deviceId + "]");
    if (this.closeFlag) {
      Taro.openBluetoothAdapter({
        success: () => {
          Taro.createBLEConnection({
            deviceId: deviceId,
            success: () => {
              this.printLog("设备连接成功");
              this.getBLEServiceId(deviceId);
            },
            fail: resf => {
              this.printLog("设备连接失败" + resf.errMsg);
            }
          })
        },
        fail: () => {
          Taro.atMessage({
            'message': '请先打开蓝牙',
            'type': 'warning',
          })
        }
      })
    } else {
      Taro.createBLEConnection({
        deviceId: deviceId,
        success: () => {
          this.printLog("设备连接成功");
          this.getBLEServiceId(deviceId);
        },
        fail: resf => {
          this.printLog("设备连接失败" + resf.errMsg);
        }
      })
      // this.closeBLE(deviceId, () => {
      //   console.log("预先关闭，再打开");
      //   setTimeout(() => {
      //     Taro.createBLEConnection({
      //       deviceId: deviceId,
      //       success: () => {
      //         this.printLog("设备连接成功");
      //         this.getBLEServiceId(deviceId);
      //       },
      //       fail: resf => {
      //         this.printLog("设备连接失败" + resf.errMsg);
      //       }
      //     })
      //   }, 2000)
      // });
    }
  }

  closeBLE = (deviceId, callback) => {
    Taro.closeBLEConnection({
      deviceId: deviceId,
      success: () => {
        this.printLog("断开设备[" + deviceId + "]成功.");
        // console.log(res)
      },
      fail: () => {
        this.printLog("断开设备[" + deviceId + "]失败.");
      },
      complete: callback
    })
  }

  // 往蓝牙传输数据
  getBLEServiceId = deviceId => {
    this.printLog("获取设备[" + deviceId + "]服务列表")
    Taro.getBLEDeviceServices({
      deviceId: deviceId,
      success: res => {
        const services = res.services;
        if (isEmpty(services)) {
          this.printLog("未找到主服务列表")
          return;
        }
        this.printLog('找到设备服务列表个数: ' + services.length);
        console.log(services);
        // if (services.length == 1){
        const service = services[0];                                                                                                                                                                                                                                         
        this.printLog("服务UUID:[" + service.uuid + "] Primary:" + service.isPrimary);
        this.getBLECharactedId(deviceId, service.uuid);
        // }else{ //多个主服务
        //   //TODO
        // }
      },
      fail: res => {
        this.printLog("获取设备服务列表失败" + res.errMsg);
      }
    })
  }

  getBLECharactedId = (deviceId, serviceId) => {
    this.printLog("获取设备特征值")
    Taro.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: serviceId,
      success: res => {
        // console.log(res);
        //这里会获取到两个特征值，一个用来写，一个用来读
        const chars = res.characteristics;
        if (isEmpty(chars)) {
          this.printLog("未找到设备特征值")
          return;
        }
        // console.log('char-------', chars);
        this.printLog("找到设备特征值个数:" + chars.length);
        if (chars.length == 2) {
          for (var i = 0; i < chars.length; i++) {
            var char = chars[i];
            // console.log(char);
            this.printLog("特征值[" + char.uuid + "]")
            const prop = char.properties;
            console.log('-----特征值', char, prop, deviceId, serviceId, char.uuid)
            if (prop.notify == true) {
              this.printLog("该特征值属性: Notify");
              this.recvBLECharacterNotice(deviceId, serviceId, char.uuid);
            } else if (prop.write == true) {
              this.printLog("该特征值属性: Write");
              this.sendBLECharacterNotice(deviceId, serviceId, char.uuid);
            } else {
              this.printLog("该特征值属性: 不支持写操作");
            }
          }
        } else {
          //TODO
        }
      },
      fail: () => {
        this.printLog("获取设备特征值失败");
      }
    })
  }

  recvBLECharacterNotice = (deviceId, serviceId, charId) => {
    //接收设置是否成功
    this.printLog("注册Notice 回调函数");
    Taro.notifyBLECharacteristicValueChange({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: charId,
      state: true, //启用Notify功能
      success: () => {
        Taro.onBLECharacteristicValueChange(res => {
          console.log(res);
          this.printLog("收到Notify数据: " + ab2hex(res.value));
          //关闭蓝牙
          Taro.showModal({
            title: '配网成功',
            content: ab2hex(res.value),
            showCancel: false
          })
        });
      },
      fail: res => {
        console.log(res);
        this.printLog("特征值Notice 接收数据失败: " + res.errMsg);
      }
    })
  }

  sendBLECharacterNotice = (deviceId, serviceId, charId) => {
    const { btnType } = this.state;
    let buffer = ''
    if (btnType === 'blue') { //wifi 发送ssid/pass
      this.printLog("延时1秒后，发送WIFI账户密码");
      const { wifiName, wifiPassWord } = this.state;
      buffer = string2buffer(JSON.stringify({
        "Command": "SetWiFiParams", 
        "data": { 
          "ssid": wifiName, 
          "psk": wifiPassWord
        }
      }));
    } else if (btnType === 'openLong') {
      this.printLog("延时1秒后，发送开启远程指令");
      buffer = string2buffer(JSON.stringify({
        "Command": "StartTodesk",
      }));
    } else if (btnType === 'closeLong') {
      this.printLog("延时1秒后，发送关闭远程指令");
      buffer = string2buffer(JSON.stringify({
        "Command": "StopTodesk", 
      }));
    } else if (btnType === 'debuggerValue') {
      const { debuggerValue } = this.state;
      buffer = string2buffer(JSON.stringify({
        "Command": "Debugger",
        "data": { 
          "value": debuggerValue
        }
      }));
    }
    // 发送蓝牙指令
    setTimeout(() => {
      Taro.writeBLECharacteristicValue({
        deviceId: deviceId,
        serviceId: serviceId,
        characteristicId: charId,
        value: buffer,
        success: () => {
          if (btnType === 'blue') {
            this.printLog("发送WIFI账户密码成功");
          } else if (btnType === 'openLong') {
            this.printLog("发送开启远程指令成功");
          } else if (btnType === 'closeLong') {
            this.printLog("发送关闭远程指令成功");
          } else if (btnType === 'debuggerValue') {
            this.printLog("发送debugger数值指令成功");
          }
        },
        fail: res => {
          this.printLog("发送指令失败." + res.errMsg);
        },
        complete: () => {
          Taro.closeBluetoothAdapter({
            success: () => {
              this.printLog("发送指令完毕，关闭蓝牙设备");
              this.closeFlag = true;
            }
          })
        }
      })
    }, 1000);
  }

  printLog = text => {
    const { logs } = this.state;
    logs.unshift(text);
    this.setState({ logs })
  }

  handleChangeName = (e) => {
    this.setState({
      wifiName: e
    })
  }

  handleChangePwd = (e) => {
    this.setState({
      wifiPassWord: e
    })
  }

  handleChangeDebuggerValue = e => {
    this.setState({
      debuggerValue: e
    })
  }

  onPickerChange = e => {
    const { deviceArray } = this.state;
    this.setState({
      currDeviceID: deviceArray[e.detail.value]
    })
  }

  render() {
    const { wifiName, wifiPassWord, logs, deviceArray, currDeviceID, debuggerValue } = this.state;
    return (
      <View className='blue-tooth-index'>
        <AtMessage />
        <View className='blue-title'>选择蓝牙设备</View>
        <Picker mode='selector' range={deviceArray} onChange={this.onPickerChange}>
          <AtList>
            <AtListItem
              title='蓝牙设备'
              extraText={currDeviceID}
            />
          </AtList>
        </Picker>
        <AtButton className='blue-btn blue-btn-reset' onClick={e => { this.onReset(e) }} >搜索蓝牙设备</AtButton>
        <View className='blue-title'>wifi信息(请先打开蓝牙，Android用户需打开GPS定位)</View>
        <AtForm className='contain-form'>
          <AtInput
            name='name'
            title='wifi名称'
            type='text'
            placeholder='请输入wifi名称'
            value={wifiName}
            onChange={this.handleChangeName}
          />
          <AtInput
            name='password'
            title='wifi密码'
            type='text'
            placeholder='请输入wifi密码'
            value={wifiPassWord}
            onChange={this.handleChangePwd}
          />
        </AtForm>
        <AtButton className='blue-btn blue-btn-submit' type='primary' onClick={() => { this.sendBlueInfo('blue') }} >蓝牙设备配网</AtButton>
        <View className='blue-title'>远程窗口</View>
        <AtButton className='long-range-open' type='secondary' onClick={() => { this.sendBlueInfo('openLong') }} >启动远程</AtButton>
        <AtButton className='long-range-close' type='primary' onClick={() => { this.sendBlueInfo('closeLong') }} >关闭远程</AtButton>
        <View className='blue-title'>debugger</View>
        <AtForm className='contain-form'>
          <AtInput
            name='debuggerValue'
            title='数值'
            type='number'
            placeholder='请输入debugger数值'
            value={debuggerValue}
            onChange={this.handleChangeDebuggerValue}
          />
        </AtForm>
        <AtButton className='blue-btn blue-btn-debugger' type='secondary' onClick={() => { this.sendBlueInfo('debuggerValue') }} >启动远程</AtButton>
        <View className='blue-title'>发送日志</View>
        <View className='blue-log'>
          {
            logs.map((v, i) => {
              return (
                <View className='at-article__p' key={i}>{v}</View>
              )
            })
          }
        </View>
      </View>
    )
  }
}

export default BlueTooth;