package com.loopandlamp.aiu;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * 1) 전체 화면(몰입 모드): 위 상태 표시줄과 아래 내비게이션 바를 숨김. 끝에서 쓸어 넘기면 잠깐 나왔다 다시 숨음.
 * 2) 뒤로 가기: 바로 꺼지지 않게 안드로이드 쪽에서 직접 받아 게임(window.aiuBack)에 물어봄.
 *    게임이 열린 창을 닫거나 "게임을 종료하시겠어요?" 창을 띄우고, 그 창에서 한 번 더 누르거나 종료를 누를 때만 앱을 닫음.
 */
public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    hideSystemBars();
    // 나중에 등록한 콜백이 먼저 불리므로 Capacitor 기본 뒤로 가기보다 앞에서 받음
    getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
      @Override
      public void handleOnBackPressed() {
        try {
          getBridge().getWebView().evaluateJavascript(
            "(window.aiuBack ? window.aiuBack() : 'ok')",
            result -> { if (result != null && result.contains("exit")) finish(); });
        } catch (Exception e) {
          // 게임 화면을 못 찾으면 아무것도 안 함 (바로 꺼지지 않게)
        }
      }
    });
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
