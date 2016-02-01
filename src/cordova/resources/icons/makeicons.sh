

for i in `cat iconsizes.txt`
do
    W=`echo $i | awk -F'x' '{print $1}'`
    H=`echo $i | awk -F'x' '{print $2}'`
    convert logo_blackgb_rounded_corners.png -resize $i icon$i.png
    echo '<icon src="resources/icons/icon'$i'.png" width="'$W'" height="'$H'" />'
done
