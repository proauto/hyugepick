/**
 * Chrome WebDriver 연결 테스트
 */

import { Builder } from 'selenium-webdriver';

async function testChromeDriver() {
  console.log('🧪 Chrome WebDriver 연결 테스트 시작');
  
  try {
    const chrome = require('selenium-webdriver/chrome');
    const options = new chrome.Options();
    
    // 헤드리스 모드 해제 (브라우저 창 보이게)
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    
    console.log('🔧 Chrome WebDriver 초기화 중...');
    
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    
    console.log('✅ WebDriver 초기화 성공!');
    
    // Google 접속 테스트
    console.log('🌐 Google 접속 테스트...');
    await driver.get('https://google.com');
    
    const title = await driver.getTitle();
    console.log(`📄 페이지 제목: ${title}`);
    
    console.log('⏳ 5초 대기 중...');
    await driver.sleep(5000);
    
    await driver.quit();
    console.log('✅ 테스트 완료 - 정상 작동');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    
    // 일반적인 해결 방법 안내
    console.log('\n💡 문제 해결 방법:');
    console.log('1. Chrome 브라우저 업데이트 확인');
    console.log('2. ChromeDriver 재설치: npm uninstall chromedriver && npm install chromedriver');
    console.log('3. 실행 중인 Chrome 프로세스 종료 후 재시도');
    console.log('4. Windows 방화벽 확인');
  }
}

testChromeDriver();