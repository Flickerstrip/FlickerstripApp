#!/usr/bin/python

import serial;
import sys;
import glob;
import argparse;
import traceback;
import time;

parser = argparse.ArgumentParser(prog='PROG')
subparsers = parser.add_subparsers(help='sub-command help')

parser_a = subparsers.add_parser('listports', help='a help')

parser_b = subparsers.add_parser('checkports', help='b help')
parser_b.add_argument('ports', nargs="+", help='baz help')

parser_c = subparsers.add_parser('openport', help='c help')
parser_c.add_argument('port', nargs=1, help='baz help')

parser_d = subparsers.add_parser('getmac', help='c help')
parser_d.add_argument('port', nargs=1, help='baz help')

def listports(args):
    ports = serial_ports();
    for port in ports:
        print port;
parser_a.set_defaults(func=listports)

def checkports(args):
    for port in args.ports:
        try:
            s = serial.Serial(port,115200,timeout=.1);
            s.write("ping\r\n");
            s.flush();
            line = s.readline();
            if ("pong" in line):
                print port;
            s.close();
        except:
            pass
parser_b.set_defaults(func=checkports)

def openport(args):
    try:
        port = args.port[0];
        s = serial.Serial(port,115200,timeout=0);
        fails = 0;
        while(True):
            try:
                s.write("ping\n");
                s.flush();
                line = s.readline();
                if ("pong" in line):
                    fails = 0;
                else:
                    fails += 1;
                if (fails >= 3):
                    break;
                if (fails == 0):
                    time.sleep(2);
                else:
                    time.sleep(.1);
            except:
                break;
        s.close();
    except:
        print traceback.format_exc();
    finally:
        if (s): s.close();
parser_c.set_defaults(func=openport)

def getmac(args):
    try:
        port = args.port[0];
        s = serial.Serial(port,115200,timeout=0);
        s.write("mac\n");
        s.flush();
        start = time.time();
        while(time.time()-start < 2):
            line = s.readline().strip();
            if (line != "" and line != "pong"):
                print line.strip()
                break;
        s.close();
    except:
        print traceback.format_exc();
parser_d.set_defaults(func=getmac)

def main():
    arg = parser.parse_args()
    arg.func(arg);
        

def serial_ports():
    """Lists serial ports

    :raises EnvironmentError:
        On unsupported or unknown platforms
    :returns:
        A list of available serial ports
    """
    if sys.platform.startswith('win'):
        ports = ['COM' + str(i + 1) for i in range(256)]

    elif sys.platform.startswith('linux') or sys.platform.startswith('cygwin'):
        # this is to exclude your current terminal "/dev/tty"
        ports = glob.glob('/dev/tty[A-Za-z]*')

    elif sys.platform.startswith('darwin'):
        ports = glob.glob('/dev/tty.*')

    else:
        raise EnvironmentError('Unsupported platform')

    return ports

main();
