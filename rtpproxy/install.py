
$ git clone -b master https://github.com/sippy/rtpproxy.git
$ git -C rtpproxy submodule update --init --recursive
$ cd rtpproxy
$ ./configure
$ make
make install

sudo groupadd --system rtpproxy
sudo useradd -s /sbin/nologin --system -g rtpproxy rtpproxy
sudo vim /etc/init.d/rtpproxy
#START
            #! /bin/sh
            ### BEGIN INIT INFO
            # Provides:          rtpproxy
            # Required-Start:    $remote_fs $syslog
            # Required-Stop:     $remote_fs $syslog
            # Default-Start:     2 3 4 5
            # Default-Stop:      0 1 6
            # Short-Description: RTP Proxy
            # Description:       Relay for VoIP media streams
            ### END INIT INFO

            PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
            NAME=rtpproxy
            DESC="RTP relay"
            DAEMON=/usr/bin/$NAME
            USER=$NAME
            GROUP=$USER
            PIDFILE="/var/run/$NAME/$NAME.pid"
            PIDFILE_DIR=`dirname $PIDFILE`
            CONTROL_SOCK="unix:$PIDFILE_DIR/$NAME.sock"

            test -x $DAEMON || exit 0
            umask 002

            . /lib/lsb/init-functions

            # Include defaults if available
            if [ -f /etc/default/$NAME ] ; then
              . /etc/default/$NAME
            fi

            DAEMON_OPTS="-s $CONTROL_SOCK -u $USER:$GROUP -p $PIDFILE $EXTRA_OPTS"

            if [ ! -d "$PIDFILE_DIR" ];then
              mkdir "$PIDFILE_DIR"
                chown $USER:$GROUP "$PIDFILE_DIR"
            fi

            set -e

            case "$1" in
              start)
              echo -n "Starting $DESC: "
              start-stop-daemon --start --quiet --pidfile $PIDFILE --exec $DAEMON -- $DAEMON_OPTS
              echo "$NAME."
              ;;
              stop)
              echo -n "Stopping $DESC: "
              start-stop-daemon --stop --quiet --oknodo --pidfile $PIDFILE --exec $DAEMON
              echo "$NAME."
              ;;
              status)
              echo -n "Status $DESC: "
              PID=$(cat $PIDFILE)
              kill -0 $PID
              rc=$?
              # Check exit code
              if [ "$rc" -ne 0 ]
              then
                echo "$NAME is NOT running."
                exit 7
              else
                echo "$NAME is running with PID: $PID"
              fi
              ;;
              restart|force-reload)
              echo -n "Restarting $DESC: "
              start-stop-daemon --stop --quiet --oknodo --pidfile $PIDFILE --exec $DAEMON
              sleep 1
              start-stop-daemon --start --quiet --pidfile $PIDFILE --exec $DAEMON -- $DAEMON_OPTS
              echo "$NAME."
              ;;
              *)
              N=/etc/init.d/$NAME
              echo "Usage: $N {start|stop|status|restart|force-reload}" >&2
              exit 1
              ;;
            esac

            exit 0
            
     #END
     
sudo chmod +x /etc/init.d/rtpproxy

sudo mkdir -p /var/run/rtpproxy
sudo chown -R rtpproxy:rtpproxy -R /var/run/rtpproxy/

sudo systemctl daemon-reload
sudo systemctl start rtpproxy.service
sudo systemctl enable rtpproxy.service


        $ systemctl status rtpproxy
        ● rtpproxy.service - LSB: RTP Proxy
             Loaded: loaded (/etc/init.d/rtpproxy; generated)
             Active: active (exited) since Sun 2020-05-03 14:55:46 UTC; 23s ago
               Docs: man:systemd-sysv-generator(8)
              Tasks: 0 (limit: 2344)
             Memory: 0B
             CGroup: /system.slice/rtpproxy.service

        May 03 14:55:46 ubuntu20 systemd[1]: Starting LSB: RTP Proxy...
        May 03 14:55:46 ubuntu20 systemd[1]: Started LSB: RTP Proxy.

