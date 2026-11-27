package com.loopandlamp.aiu;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * 전체 화면(몰입 모드): 위 상태 표시줄과 아래 내비게이션 바를 숨김.
 * 화면 끝에서 쓸어 넘기면 잠깐 나왔다가 다시 숨음 (게임 앱 기본 방식).
 * 카메라 구멍(노치) 자리는 기본값으로 두어 게임 위쪽 글자가 가려지지 않게 함.
 */
public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    hideSystemBars();
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    // 다른 앱이나 알림창에서 돌아오면 다시 숨김
    if (hasFocus) hideSystemBars();
  }

  private void hideSystemBars() {
    try {
      WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
      WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
      c.hide(WindowInsetsCompat.Type.systemBars());
      c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    } catch (Exception e) {
      // 숨기기에 실패해도 게임은 그대로 실행
    }
  }
}
