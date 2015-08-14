// License information is available from LICENSE file

/*
 * This file is only a sample
 * You are free to update it with the methods you need
 * from the Native Mobile API
 */

package io.jxcore.node;

import io.jxcore.node.jxcore.JXcoreCallback;
import java.util.ArrayList;
import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Point;
import android.provider.Settings.SettingNotFoundException;
import android.view.Display;
import android.view.WindowManager;
import android.util.Log;

public class JXcoreExtension {
  public static String TAG = "LEDControl";
  public static void LoadExtensions() {
    jxcore.RegisterMethod("Log", new JXcoreCallback() {
      @SuppressLint("NewApi")
      @Override
      public void Receiver(ArrayList<Object> params, String callbackId) {
        for (Object p : params) {
            Log.v(TAG,p.toString());
        }
      }
    });
  }
}
